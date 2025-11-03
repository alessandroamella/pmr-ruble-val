import { addDays, subDays } from 'date-fns';
import { sql } from 'drizzle-orm';
import cron from 'node-cron';
import { envs } from 'server/config/envs';
import { db } from 'server/db';
import { exchangeRates, type NewExchangeRate } from 'server/db/schema';
import { logger } from 'server/utils/logger';
import { sleep } from 'server/utils/sleep';
import { CURRENCIES, fetchCurrencyData } from './scraper-logic';

const CRON_SCHEDULE = '0 2 * * *'; // Runs daily at 2:00 AM
const FROM_DAYS_AGO = 3; // Number of days back to fetch data for

/**
 * The core function that performs the update logic for all currencies.
 */
export async function updateRates() {
  logger.info('Starting scheduled rate update...');

  const tomorrow = addDays(new Date(), 1);
  const nDaysAgo = subDays(new Date(), FROM_DAYS_AGO);

  let updatedRecordCount = 0;

  for (const [code, name] of Object.entries(CURRENCIES)) {
    await sleep(1000); // Be polite to the source API

    logger.info(`\n-> Checking currency: ${name} (${code})`);

    // 1. Fetch fresh data for specified date range.
    const newRecords = await fetchCurrencyData(code, name, nDaysAgo, tomorrow);

    if (newRecords.length === 0) {
      logger.info('   No recent data found from the source.');
      continue;
    }

    // 2. Determine the currency code.
    const letterCode = newRecords[0].letter_code?.toLowerCase();
    if (!letterCode) {
      logger.warn(
        `   WARNING: Could not determine letter code for ${name}. Skipping.`,
      );
      continue;
    }

    // 3. Prepare values to insert/update
    const valuesToInsert: NewExchangeRate[] = newRecords.map((rec) => {
      const rawRate = rec.units > 1 ? rec.rate / rec.units : rec.rate;
      // Round to 7 decimal places to avoid floating-point precision errors
      const roundedRate = Math.round(rawRate * 1e7) / 1e7;
      return {
        currencyCode: letterCode,
        date: rec.date,
        rate: roundedRate,
      };
    });

    if (valuesToInsert.length === 0) continue;

    logger.info(
      `   Found ${valuesToInsert.length} records to process for ${name} (${letterCode}).`,
    );

    // 4. Upsert into database
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

    if (result.length > 0) {
      logger.info(`   ✅ Upserted ${result.length} records for ${letterCode}.`);
      updatedRecordCount += result.length;
    }
  }

  logger.info(
    `\nUpdate cycle finished. ${updatedRecordCount} records were upserted.`,
  );
}

// Schedules and starts the cron job for updating official rates
export function startOfficialRatesCronJob() {
  logger.info(
    `Official rates updater cron job initialized with pattern: "${CRON_SCHEDULE}"`,
  );

  // Optional: Run on startup
  if (envs.RUN_ON_STARTUP) {
    logger.info('Running initial update on startup...');
    updateRates().catch((err) => logger.error('Initial update failed:', err));
  }

  cron.schedule(CRON_SCHEDULE, () => {
    updateRates().catch((error) => {
      logger.error(
        'A critical error occurred during the scheduled update:',
        error,
      );
    });
  });
}
