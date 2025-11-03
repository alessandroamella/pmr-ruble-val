import { format, startOfDay, subYears } from 'date-fns';
import { sql } from 'drizzle-orm';
import pLimit from 'p-limit';
import { envs } from 'server/config/envs';
import { db } from 'server/db';
import { exchangeRates, type NewExchangeRate } from 'server/db/schema';
import { logger } from 'server/utils/logger';
import { sleep } from 'server/utils/sleep';
import { CURRENCIES, fetchCurrencyData } from './scraper-logic';

// Change this range to fetch historical data
const today = startOfDay(new Date());
const START_DATE = subYears(today, 5); // 5 years ago from today
const END_DATE = today; // Up to today

const { PARALLEL_FETCHES } = envs;

/**
 * Formats a Date object to 'yyyy-MM-dd' string.
 * @param date The Date object to format.
 * @returns The formatted date string.
 */
function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Processes a single currency: fetches data and inserts it into the database.
 * This function encapsulates the logic that was previously using CSV files.
 * @param code The currency code (e.g., 'R01235').
 * @param name The currency name (e.g., 'US Dollar').
 * @returns A promise that resolves to the number of records upserted, or 0 if failed.
 */
async function processCurrency(code: string, name: string): Promise<number> {
  logger.info(`[START] Fetching data for: ${name} (${code})`);

  try {
    const currencyRecords = await fetchCurrencyData(
      code,
      name,
      START_DATE,
      END_DATE,
    );

    if (currencyRecords.length === 0) {
      logger.warn(` -> [SKIP] No records found for ${name}. Skipping.`);
      return 0;
    }

    logger.info(
      ` -> [FETCHED] ${name} (${code}) - Found ${currencyRecords.length} records.`,
    );

    const letterCode = currencyRecords[0].letter_code?.toLowerCase();
    if (!letterCode) {
      logger.warn(` -> [SKIP] Could not determine letter code for ${name}.`);
      return 0;
    }

    // Prepare values to insert/update
    const valuesToInsert: NewExchangeRate[] = currencyRecords.map((rec) => {
      const rawRate = rec.units > 1 ? rec.rate / rec.units : rec.rate;
      // Round to 7 decimal places to avoid floating-point precision errors
      const roundedRate = Math.round(rawRate * 1e7) / 1e7;
      return {
        currencyCode: letterCode,
        date: rec.date,
        rate: roundedRate,
      };
    });

    if (valuesToInsert.length === 0) return 0;

    // Upsert into database
    // If a record with the same primary key (date, currencyCode) exists,
    // it updates the 'rate'. Otherwise, it inserts a new row.
    const result = await db
      .insert(exchangeRates)
      .values(valuesToInsert)
      .onConflictDoUpdate({
        target: [exchangeRates.currencyCode, exchangeRates.date],
        set: { rate: sql`excluded.rate` },
      })
      .returning({ updatedDate: exchangeRates.date });

    logger.info(
      `   -> [SAVED] ${name} (${code}) - Upserted ${result.length} records to database`,
    );

    // Be polite to the server. This sleep is now per-worker, not blocking the entire script.
    await sleep(1000);

    return result.length;
  } catch (error) {
    logger.error(` -> [ERROR] Failed to process ${name} (${code}):`, error);
    return 0; // Indicate failure for this currency
  }
}

/**
 * Main function, orchestrating parallel processing and inserting data into the database.
 */
async function main() {
  logger.info(
    `Starting historical data loader for ${Object.keys(CURRENCIES).length} currencies...`,
  );
  logger.info(`Concurrency level set to: ${PARALLEL_FETCHES}`);
  logger.info(
    `Date range: ${formatDate(START_DATE)} to ${formatDate(END_DATE)}\n`,
  );

  // Create a limiter that will execute at most PARALLEL_FETCHES promises concurrently.
  const limit = pLimit(PARALLEL_FETCHES);

  // Create an array of task-running promises.
  // Each task is wrapped in the limiter.
  const tasks = Object.entries(CURRENCIES).map(([code, name]) => {
    return limit(() => processCurrency(code, name));
  });

  // Wait for all the tasks to complete.
  const results = await Promise.all(tasks);

  // Sum up the total number of records upserted.
  const totalRecordsUpserted = results.reduce((sum, count) => sum + count, 0);

  logger.info(
    `\n🎉 All done! Upserted ${totalRecordsUpserted} total records into the database.`,
  );
}

main().catch((error) => {
  logger.error(
    'A critical error occurred during the historical data loading script:',
    error,
  );
  process.exit(1);
});
