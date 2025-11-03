import type { Request, Response } from 'express';
import { Router } from 'express';
import { logger } from 'server/utils/logger.ts';
import {
  getAllLatestRates,
  getLatestRate,
  getRatesForCurrencies,
} from './rates-service.ts';

const router = Router();

// Endpoint for latest rates for all currencies
router.get('/latest', async (_req: Request, res: Response) => {
  try {
    const allLatestRates = await getAllLatestRates(); // Caching is now handled inside this function
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

  try {
    const latestRecord = await getLatestRate(currencyCode); // Caching is handled inside

    if (latestRecord) {
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

  try {
    const data = await getRatesForCurrencies(currencyCodes, startDate, endDate); // Caching is handled inside
    return res.status(200).json(data);
  } catch (error) {
    logger.error('Error fetching currency data:', error);
    return res
      .status(500)
      .json({ error: 'An internal server error occurred.' });
  }
});

export default router;
