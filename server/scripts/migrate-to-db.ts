import 'dotenv/config'; // Make sure to load environment variables
import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import csv from 'csv-parser';
import { DrizzleQueryError } from 'drizzle-orm';
import { db } from 'server/db'; // Your centralized drizzle instance
import { exchangeRates, type NewExchangeRate } from 'server/db/schema';
import { CURRENCIES_CSV_DATA_DIR } from 'server/official-data/currencies-csv-data-dir';
import { logger } from 'server/utils/logger';

// Define the batch size for insertions.
// Inserting thousands of rows one-by-one is slow. Batching is much faster.
const BATCH_SIZE = 500;

interface SimpleRateRecord {
  Date: string;
  Rate: string;
}

/**
 * Reads and parses a single CSV file.
 * @param filePath The full path to the CSV file.
 * @returns A promise that resolves to an array of parsed records.
 */
async function readCsvFile(filePath: string): Promise<SimpleRateRecord[]> {
  const records: SimpleRateRecord[] = [];
  const stream = createReadStream(filePath).pipe(csv());

  return new Promise((resolve, reject) => {
    stream.on('data', (data) => records.push(data));
    stream.on('end', () => resolve(records));
    stream.on('error', (error) => reject(error));
  });
}

/**
 * The main migration function.
 * Call only once to migrate data from CSV files to the database.
 */
export async function migrateCsvToDb() {
  logger.info('🚀 Starting migration from CSV files to SQLite database...');
  logger.info(`Looking for CSV files in: ${CURRENCIES_CSV_DATA_DIR}`);

  // 1. Get a list of all .csv files from your data directory.
  const allFiles = await readdir(CURRENCIES_CSV_DATA_DIR);
  const csvFiles = allFiles.filter((file) =>
    file.toLowerCase().endsWith('.csv'),
  );

  if (csvFiles.length === 0) {
    logger.info('No CSV files found. Exiting.');
    return;
  }

  logger.info(`Found ${csvFiles.length} CSV files to process.`);
  let totalRowsMigrated = 0;

  // 2. Process each CSV file one by one.
  for (const fileName of csvFiles) {
    // Extract the currency code from the filename (e.g., "usd.csv" -> "usd").
    const currencyCode = path.parse(fileName).name.toLowerCase();
    const filePath = path.join(CURRENCIES_CSV_DATA_DIR, fileName);

    logger.info(`\nProcessing ${fileName} for currency [${currencyCode}]...`);

    try {
      const records = await readCsvFile(filePath);

      if (records.length === 0) {
        logger.info(`  -> No records found in ${fileName}. Skipping.`);
        continue;
      }

      logger.info(`  -> Found ${records.length} records to migrate.`);

      // 3. Transform CSV data into the format for our database schema.
      const dataToInsert: NewExchangeRate[] = records.map((rec) => {
        const rawRate = Number.parseFloat(rec.Rate);
        // Round to 7 decimal places to avoid floating-point precision errors
        const roundedRate = Math.round(rawRate * 1e7) / 1e7;
        return {
          currencyCode: currencyCode,
          date: rec.Date,
          rate: roundedRate,
        };
      });

      // 4. Insert data into the database in batches.
      for (let i = 0; i < dataToInsert.length; i += BATCH_SIZE) {
        const batch = dataToInsert.slice(i, i + BATCH_SIZE);

        // Use onConflictDoNothing to avoid errors if you run the script twice.
        // It will simply skip inserting rows where the primary key (date, currencyCode)
        // already exists.
        await db.insert(exchangeRates).values(batch).onConflictDoNothing();

        logger.info(
          `  -> Inserted batch ${i / BATCH_SIZE + 1} (${batch.length} rows)`,
        );
      }

      totalRowsMigrated += dataToInsert.length;
      logger.info(
        `  ✅ Successfully migrated ${dataToInsert.length} rows for ${currencyCode}.`,
      );
    } catch (error) {
      logger.error(`  ❌ Failed to process ${fileName}:\n  -> `);
      if (error instanceof DrizzleQueryError) {
        logger.warn(
          'DrizzleQueryError occurred,' +
            '\nname:' +
            error.name +
            'params:' +
            error.params +
            '\ncause name:' +
            error.cause?.name +
            '\ncause cause:' +
            error.cause?.cause,
        );
      } else {
        logger.error('Unexpected error:', error);
      }
    }
  }

  if (totalRowsMigrated > 0) {
    logger.info('\n🎉 Migration complete!');
    logger.info(`Total rows processed and migrated: ${totalRowsMigrated}`);
  } else {
    logger.info(
      '\n⚠️  No new rows were migrated. Database may already be up to date.',
    );
  }
}

migrateCsvToDb().catch((error) => {
  logger.error('Migration failed with error:', error);
  process.exit(1);
});
