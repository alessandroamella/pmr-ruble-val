import { and, between, desc, eq, inArray, sql } from 'drizzle-orm';
import NodeCache from 'node-cache';
import { db } from 'server/db';
import { exchangeRates } from 'server/db/schema';

export const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export interface RateRecordResponse {
  date: string;
  rate: string;
}

export async function getRatesForCurrencies(
  currencyCodes: string[],
  startDate: string,
  endDate: string,
): Promise<Record<string, RateRecordResponse[]>> {
  const queryResult = await db.query.exchangeRates.findMany({
    where: and(
      inArray(exchangeRates.currencyCode, currencyCodes),
      between(exchangeRates.date, startDate, endDate),
    ),
    orderBy: [exchangeRates.date],
  });

  const results: Record<string, RateRecordResponse[]> = {};
  currencyCodes.forEach((code) => {
    results[code] = [];
  });

  for (const record of queryResult) {
    results[record.currencyCode].push({
      date: record.date,
      rate: record.rate.toString(),
    });
  }
  return results;
}

export async function getLatestRate(
  currencyCode: string,
): Promise<RateRecordResponse | null> {
  const result = await db.query.exchangeRates.findFirst({
    where: eq(exchangeRates.currencyCode, currencyCode),
    orderBy: [desc(exchangeRates.date)],
  });

  return result ? { date: result.date, rate: result.rate.toString() } : null;
}

export async function getAllLatestRates(): Promise<
  Record<string, RateRecordResponse | null>
> {
  // This advanced query groups by currency and finds the latest date for each one.
  const sq = db
    .select({
      currencyCode: exchangeRates.currencyCode,
      maxDate: sql<string>`max(${exchangeRates.date})`.as('max_date'),
    })
    .from(exchangeRates)
    .groupBy(exchangeRates.currencyCode)
    .as('sq');

  const queryResult = await db
    .select({
      code: exchangeRates.currencyCode,
      date: exchangeRates.date,
      rate: exchangeRates.rate,
    })
    .from(exchangeRates)
    .innerJoin(
      sq,
      and(
        eq(exchangeRates.currencyCode, sq.currencyCode),
        eq(exchangeRates.date, sq.maxDate),
      ),
    );

  return queryResult.reduce(
    (acc, row) => {
      acc[row.code] = { date: row.date, rate: row.rate.toString() };
      return acc;
    },
    {} as Record<string, RateRecordResponse>,
  );
}
