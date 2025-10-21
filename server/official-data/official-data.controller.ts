import { access } from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import { Router } from 'express';
import { CURRENCIES_CSV_DATA_DIR } from './currencies-csv-data-dir.ts';
import {
  cache,
  getAllLatestRates,
  getLatestRate,
  getRatesForCurrencies,
  type RateRecordResponse,
} from './rates-service.ts';

const router = Router();

// Endpoint for latest rates for all currencies
router.get('/latest', async (_req: Request, res: Response) => {
  const cacheKey = 'latest:all';

  const cachedData =
    cache.get<Record<string, RateRecordResponse | null>>(cacheKey);
  if (cachedData) {
    return res.status(200).json(cachedData);
  }

  try {
    const allLatestRates = await getAllLatestRates();
    cache.set(cacheKey, allLatestRates);
    return res.status(200).json(allLatestRates);
  } catch (error) {
    console.error('Error fetching all latest rates:', error);
    return res
      .status(500)
      .json({ error: 'An internal server error occurred.' });
  }
});

// Endpoint for latest rate
router.get('/:currency/latest', async (req: Request, res: Response) => {
  const currencyCode = req.params.currency.toLowerCase();
  const filePath = path.join(CURRENCIES_CSV_DATA_DIR, `${currencyCode}.csv`);
  const cacheKey = `latest:${currencyCode}`;

  const cachedData = cache.get<RateRecordResponse>(cacheKey);
  if (cachedData) {
    return res.status(200).json(cachedData);
  }

  try {
    await access(filePath);
    const latestRecord = await getLatestRate(filePath);
    if (latestRecord) {
      cache.set(cacheKey, latestRecord);
      return res.status(200).json(latestRecord);
    }
    return res.status(404).json({
      error: `No rate records found for currency '${currencyCode}'.`,
    });
  } catch {
    return res
      .status(404)
      .json({ error: `Data for currency '${currencyCode}' not found.` });
  }
});

// Endpoint for historical rates
router.get('/historical', async (req: Request, res: Response) => {
  const { startDate, endDate, currencies } = req.query;

  if (
    !startDate ||
    !endDate ||
    !currencies ||
    typeof startDate !== 'string' ||
    typeof endDate !== 'string' ||
    typeof currencies !== 'string'
  ) {
    return res.status(400).json({ error: 'Missing or invalid parameters.' });
  }

  const currencyCodes = currencies
    .toLowerCase()
    .split(',')
    .filter((c) => c.trim() !== '');
  if (currencyCodes.length === 0) {
    return res
      .status(400)
      .json({ error: 'The currencies parameter cannot be empty.' });
  }

  const cacheKey = `rates:${startDate}:${endDate}:${currencyCodes.sort().join(',')}`;

  const cachedData = cache.get<Record<string, RateRecordResponse[]>>(cacheKey);
  if (cachedData) {
    return res.status(200).json(cachedData);
  }

  try {
    const data = await getRatesForCurrencies(currencyCodes, startDate, endDate);
    cache.set(cacheKey, data);
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching currency data:', error);
    return res
      .status(500)
      .json({ error: 'An internal server error occurred.' });
  }
});

export default router;
