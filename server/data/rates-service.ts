import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import csv from 'csv-parser';
import NodeCache from 'node-cache';

// Use import.meta.dirname for ES Modules
const DATA_DIR = path.resolve(import.meta.dirname, '../../currency_data');

// Initialize cache with a TTL of 5 minutes (300 seconds)
export const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

interface RateRecordCsv {
  Date: string;
  Rate: string;
}

export interface RateRecordResponse {
  date: string;
  rate: string;
}

async function readAndFilterCsv(
  filePath: string,
  startDate: string,
  endDate: string,
): Promise<RateRecordResponse[]> {
  const records: RateRecordResponse[] = [];

  return new Promise((resolve, reject) => {
    createReadStream(filePath)
      .pipe(csv())
      .on('data', (row: RateRecordCsv) => {
        if (row.Date >= startDate && row.Date <= endDate) {
          records.push({
            date: row.Date,
            rate: row.Rate,
          });
        }
      })
      .on('end', () => resolve(records))
      .on('error', (error) =>
        reject(
          new Error(
            `Error processing CSV file at ${filePath}: ${error.message}`,
          ),
        ),
      );
  });
}

export async function getRatesForCurrencies(
  currencyCodes: string[],
  startDate: string,
  endDate: string,
): Promise<Record<string, RateRecordResponse[]>> {
  const results: Record<string, RateRecordResponse[]> = {};

  const promises = currencyCodes.map(async (code) => {
    const filePath = path.join(DATA_DIR, `${code}.csv`);
    try {
      await access(filePath);
      const records = await readAndFilterCsv(filePath, startDate, endDate);
      return { code, records, success: true };
    } catch (error) {
      console.warn(
        `Could not find or process data for currency: ${code}`,
        error,
      );
      return { code, records: [], success: false };
    }
  });

  const settledResults = await Promise.all(promises);

  for (const result of settledResults) {
    results[result.code] = result.records;
  }

  return results;
}

export async function getLatestRate(
  filePath: string,
): Promise<RateRecordResponse | null> {
  let latestRecord: RateRecordResponse | null = null;

  return new Promise((resolve, reject) => {
    createReadStream(filePath)
      .pipe(csv())
      .on('data', (row: RateRecordCsv) => {
        latestRecord = {
          date: row.Date,
          rate: row.Rate,
        };
      })
      .on('end', () => resolve(latestRecord))
      .on('error', (error) =>
        reject(
          new Error(`Error reading CSV file at ${filePath}: ${error.message}`),
        ),
      );
  });
}
