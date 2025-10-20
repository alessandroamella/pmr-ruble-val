import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import cron from 'node-cron';
import { CURRENCIES, fetchCurrencyData, sleep } from './scraper-logic';

import 'dotenv/config';
import { addDays, format, subDays } from 'date-fns';
import { DATA_DIR } from 'server/data-dir';

// const CRON_SCHEDULE = '0 */4 * * *'; // Runs at the start of every 4th hour

// once a day
const CRON_SCHEDULE = '0 2 * * *'; // Runs daily at 2:00 AM
const FROM_DAYS_AGO = 3; // Number of days back to fetch data for

interface SimpleRateRecord {
  Date: string;
  Rate: string; // Keep as string to match csv-parser's output
}

/**
 * Reads a CSV file and parses it into an array of objects.
 * @param filePath The full path to the CSV file.
 * @returns A promise that resolves to an array of records, or an empty array if the file doesn't exist.
 */
async function readCsvFile(filePath: string): Promise<SimpleRateRecord[]> {
  // Check if the file exists first. If not, return an empty array.
  try {
    await access(filePath);
  } catch {
    return []; // File doesn't exist, so there are no records to read.
  }

  const records: SimpleRateRecord[] = [];
  const stream = createReadStream(filePath).pipe(csv());

  return new Promise((resolve, reject) => {
    stream.on('data', (data) => records.push(data));
    stream.on('end', () => resolve(records));
    stream.on('error', (error) => reject(error));
  });
}

function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * The core function that performs the update logic for all currencies.
 */
export async function updateRates() {
  console.log(
    `[${new Date().toISOString()}] Starting scheduled rate update...`,
  );

  // Define the date range: nDaysAgo and tomorrow.
  const tomorrow = addDays(new Date(), 1);
  const nDaysAgo = subDays(new Date(), FROM_DAYS_AGO);

  let updatedFileCount = 0;

  for (const [code, name] of Object.entries(CURRENCIES)) {
    await sleep(1000); // Be polite to the source API

    console.log(
      `\n-> Checking currency: ${name} (${code}) from ${formatDate(nDaysAgo)} to ${formatDate(tomorrow)}`,
    );

    // 1. Fetch fresh data for specified date range.
    const newRecords = await fetchCurrencyData(code, name, nDaysAgo, tomorrow);

    if (newRecords.length === 0) {
      console.log('   No recent data found from the source.');
      continue;
    }

    // 2. Determine the target CSV file.
    const letterCode = newRecords[0].letter_code;
    if (!letterCode) {
      console.warn(
        `   WARNING: Could not determine letter code for ${name}. Skipping.`,
      );
      continue;
    }
    const fileName = `${letterCode.toLowerCase()}.csv`;
    const filePath = path.resolve(DATA_DIR, fileName);

    // 3. Read existing data from the CSV.
    const existingRecords = await readCsvFile(filePath);
    console.log(
      `   Found ${existingRecords.length} existing records in ${fileName}.`,
    );

    // 4. Use a Map for efficient merging and updating.
    const recordsMap = new Map<string, SimpleRateRecord>();
    for (const record of existingRecords) {
      recordsMap.set(record.Date, record);
    }

    let hasChanges = false;
    // 5. Merge new data into the map.
    for (const newRecord of newRecords) {
      const normalizedRate = (
        newRecord.units > 1 ? newRecord.rate / newRecord.units : newRecord.rate
      ).toString();
      if (newRecord.units > 1) {
        console.log(
          `   Note: Normalizing rate for ${newRecord.date} from unit ${newRecord.units} to 1.`,
        );
        console.log(
          `         Original Rate: ${newRecord.rate}, Normalized Rate: ${normalizedRate}`,
        );
      }

      const existing = recordsMap.get(newRecord.date);

      if (!existing) {
        // Entry for this date doesn't exist, so add it.
        console.log(
          `   [NEW] Adding rate for ${newRecord.date}: ${normalizedRate}`,
        );
        recordsMap.set(newRecord.date, {
          Date: newRecord.date,
          Rate: normalizedRate,
        });
        hasChanges = true;
      } else if (existing.Rate !== normalizedRate) {
        // Entry exists, but the rate is different. Update it.
        console.log(
          `   [UPDATE] Updating rate for ${newRecord.date}. Old: ${existing.Rate}, New: ${normalizedRate}`,
        );
        existing.Rate = normalizedRate; // Directly mutate the object in the map
        hasChanges = true;
      }
    }

    // 6. If changes were made, write the updated data back to the CSV.
    if (hasChanges) {
      // Convert map back to an array and sort by date.
      const updatedRecords = Array.from(recordsMap.values()).sort((a, b) =>
        a.Date.localeCompare(b.Date),
      );

      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'Date', title: 'Date' },
          { id: 'Rate', title: 'Rate' },
        ],
      });

      await csvWriter.writeRecords(updatedRecords);
      console.log(`   ✅ Successfully updated ${fileName}`);
      updatedFileCount++;
    } else {
      console.log('   No changes needed for this currency.');
    }
  }

  console.log(
    `\n[${new Date().toISOString()}] Update cycle finished. ${updatedFileCount} file(s) were modified.`,
  );
}

// --- NEW EXPORTED FUNCTION ---
export function startCronJob() {
  console.log('🚀 Rate Updater Service Initialized.');
  console.log(`🕒 Scheduling job with pattern: "${CRON_SCHEDULE}"`);

  // Optional: Run on startup
  if (process.env.NODE_ENV === 'production') {
    console.log('Running initial update on startup...');
    updateRates().catch((err) => console.error('Initial update failed:', err));
  }

  cron.schedule(CRON_SCHEDULE, () => {
    updateRates().catch((error) => {
      console.error(
        'A critical error occurred during the scheduled update:',
        error,
      );
    });
  });
}
