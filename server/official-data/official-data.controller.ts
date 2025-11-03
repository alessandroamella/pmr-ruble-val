import type { Request, Response } from 'express';
import { Router } from 'express';
import { logger } from 'server/utils/logger.ts';
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
    logger.error('Error fetching all latest rates:', error);
    return res
      .status(500)
      .json({ error: 'An internal server error occurred.' });
  }
});

// Endpoint for latest rate for a specific currency
router.get('/:currency/latest', async (req: Request, res: Response) => {
  const currencyCode = req.params.currency.toLowerCase();
  const cacheKey = `latest:${currencyCode}`;

  const cachedData = cache.get<RateRecordResponse>(cacheKey);
  if (cachedData) {
    return res.status(200).json(cachedData);
  }

  try {
    // The service no longer needs a file path!
    const latestRecord = await getLatestRate(currencyCode);

    if (latestRecord) {
      cache.set(cacheKey, latestRecord);
      return res.status(200).json(latestRecord);
    }
    return res.status(404).json({
      error: `No rate records found for currency '${currencyCode}'.`,
    });
  } catch (error) {
    logger.error(`Error fetching latest rate for ${currencyCode}:`, error);
    return res
      .status(500)
      .json({ error: 'An internal server error occurred.' });
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
    logger.error('Error fetching currency data:', error);
    return res
      .status(500)
      .json({ error: 'An internal server error occurred.' });
  }
});

export default router;
