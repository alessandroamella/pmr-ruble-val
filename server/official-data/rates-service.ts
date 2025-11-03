import { and, between, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from 'server/db';
import { exchangeRates } from 'server/db/schema';
import { redisCacheService } from 'server/services/cache.service'; // <-- IMPORT the new service

const CACHE_TTL_SECONDS = 300; // 5 minutes

export interface RateRecordResponse {
  date: string;
  rate: string;
}

export async function getRatesForCurrencies(
  currencyCodes: string[],
  startDate: string,
  endDate: string,
): Promise<Record<string, RateRecordResponse[]>> {
  const cacheKey = `rates:${startDate}:${endDate}:${currencyCodes.sort().join(',')}`;

  const cachedData =
    await redisCacheService.get<Record<string, RateRecordResponse[]>>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

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

  await redisCacheService.set(cacheKey, results, CACHE_TTL_SECONDS);
  return results;
}

export async function getLatestRate(
  currencyCode: string,
): Promise<RateRecordResponse | null> {
  const cacheKey = `latest:${currencyCode}`;

  const cachedData = await redisCacheService.get<RateRecordResponse>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const result = await db.query.exchangeRates.findFirst({
    where: eq(exchangeRates.currencyCode, currencyCode),
    orderBy: [desc(exchangeRates.date)],
  });

  if (result) {
    const rateResponse = { date: result.date, rate: result.rate.toString() };
    await redisCacheService.set(cacheKey, rateResponse, CACHE_TTL_SECONDS);
    return rateResponse;
  }

  return null;
}

export async function getAllLatestRates(): Promise<
  Record<string, RateRecordResponse | null>
> {
  const cacheKey = 'latest:all';

  const cachedData =
    await redisCacheService.get<Record<string, RateRecordResponse | null>>(
      cacheKey,
    );
  if (cachedData) {
    return cachedData;
  }

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

  const results = queryResult.reduce(
    (acc, row) => {
      acc[row.code] = { date: row.date, rate: row.rate.toString() };
      return acc;
    },
    {} as Record<string, RateRecordResponse>,
  );

  await redisCacheService.set(cacheKey, results, CACHE_TTL_SECONDS);
  return results;
}
