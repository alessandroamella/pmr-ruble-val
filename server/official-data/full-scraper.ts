import { createReadStream, promises as fs } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import { format, startOfDay, subYears } from 'date-fns';
import pLimit from 'p-limit';
import { envs } from 'server/config/envs';
import { CURRENCIES_CSV_DATA_DIR } from 'server/official-data/currencies-csv-data-dir';
import { sleep } from 'server/utils/sleep';
import { CURRENCIES, fetchCurrencyData } from './scraper-logic';

// Change this range to fetch historical data
const today = startOfDay(new Date());
const START_DATE = subYears(today, 5); // 5 years ago from today
const END_DATE = today; // Up to today

const { PARALLEL_FETCHES } = envs;

interface SimpleRateRecord {
  Date: string;
  Rate: string;
}

/**
 * Formats a Date object to 'yyyy-MM-dd' string.
 * @param date The Date object to format.
 * @returns The formatted date string.
 */
function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Reads a CSV file and parses it into an array of objects.
 * @param filePath The full path to the CSV file.
 * @returns A promise that resolves to an array of records, or an empty array if the file doesn't exist.
 */
async function readCsvFile(filePath: string): Promise<SimpleRateRecord[]> {
  try {
    await access(filePath);
  } catch {
    return []; // File doesn't exist, so no existing records.
  }

  const records: SimpleRateRecord[] = [];
  const stream = createReadStream(filePath).pipe(csv());

  return new Promise((resolve, reject) => {
    stream.on('data', (data) => records.push(data));
    stream.on('end', () => resolve(records));
    stream.on('error', (error) => reject(error));
  });
}

/**
 * Processes a single currency: fetches data, reads existing CSV, merges, and writes the result.
 * This function encapsulates the logic that was previously inside the main loop.
 * @param code The currency code (e.g., 'R01235').
 * @param name The currency name (e.g., 'US Dollar').
 * @param outputDir The directory to save the CSV file in.
 * @returns A promise that resolves to true if a file was updated, false otherwise.
 */
async function processCurrency(
  code: string,
  name: string,
  outputDir: string,
): Promise<boolean> {
  console.log(`[START] Fetching data for: ${name} (${code})`);

  try {
    const currencyRecords = await fetchCurrencyData(
      code,
      name,
      START_DATE,
      END_DATE,
    );

    if (currencyRecords.length === 0) {
      console.warn(
        ` -> [SKIP] No new records found for ${name}. Skipping CSV creation.`,
      );
      return false;
    }

    console.log(
      ` -> [FETCHED] ${name} (${code}) - Found ${currencyRecords.length} new records.`,
    );

    const letterCode = currencyRecords[0].letter_code;
    if (!letterCode) {
      console.warn(` -> [SKIP] Could not determine letter code for ${name}.`);
      return false;
    }

    const fileName = `${letterCode.toLowerCase()}.csv`;
    const filePath = path.resolve(outputDir, fileName);

    // Read, Merge, Write Logic
    const existingRecords = await readCsvFile(filePath);
    const recordsMap = new Map<string, SimpleRateRecord>();

    for (const record of existingRecords) {
      recordsMap.set(record.Date, record);
    }

    for (const newRecord of currencyRecords) {
      const processedRecord = {
        Date: newRecord.date,
        Rate: (newRecord.units > 1
          ? newRecord.rate / newRecord.units
          : newRecord.rate
        ).toString(),
      };
      recordsMap.set(processedRecord.Date, processedRecord);
    }

    const finalRecords = Array.from(recordsMap.values()).sort((a, b) =>
      a.Date.localeCompare(b.Date),
    );

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'Date', title: 'Date' },
        { id: 'Rate', title: 'Rate' },
      ],
    });

    await csvWriter.writeRecords(finalRecords);
    console.log(
      `   -> [SAVED] ${name} (${code}) - Saved ${finalRecords.length} total records to ${fileName}`,
    );

    // Be polite to the server. This sleep is now per-worker, not blocking the entire script.
    await sleep(1000);

    return true;
  } catch (error) {
    console.error(` -> [ERROR] Failed to process ${name} (${code}):`, error);
    return false; // Indicate failure for this currency
  }
}

/**
 * Main function, now orchestrating parallel processing.
 */
async function main() {
  console.log(
    `Starting CSV scraper for ${Object.keys(CURRENCIES).length} currencies...`,
  );
  console.log(`Concurrency level set to: ${PARALLEL_FETCHES}`);
  console.log(
    `Date range: ${formatDate(START_DATE)} to ${formatDate(END_DATE)}\n`,
  );

  await fs.mkdir(CURRENCIES_CSV_DATA_DIR, { recursive: true });
  console.log(`Saving CSV files to: ${CURRENCIES_CSV_DATA_DIR}\n`);

  // Create a limiter that will execute at most PARALLEL_FETCHES promises concurrently.
  const limit = pLimit(PARALLEL_FETCHES);

  // Create an array of task-running promises.
  // Each task is wrapped in the limiter.
  const tasks = Object.entries(CURRENCIES).map(([code, name]) => {
    return limit(() => processCurrency(code, name, CURRENCIES_CSV_DATA_DIR));
  });

  // Wait for all the tasks to complete.
  const results = await Promise.all(tasks);

  // Count how many tasks returned `true` (indicating a successful update).
  const filesUpdated = results.filter(Boolean).length;

  console.log(
    `\n🎉 All done! Updated/created ${filesUpdated} CSV files in the 'currency_data' directory.`,
  );
}

main().catch((error) => {
  console.error(
    'A critical error occurred during the CSV scraping script:',
    error,
  );
  process.exit(1);
});
