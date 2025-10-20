import { access } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import type { Express, Request, Response } from 'express';

// Import our new local data functions
import {
  cache,
  getLatestRate,
  getRatesForCurrencies,
  type RateRecordResponse,
} from './data/rates-service.ts';

// Use import.meta.dirname for ES Modules
const DATA_DIR = path.resolve(import.meta.dirname, '../currency_data');

export async function registerRoutes(app: Express): Promise<Server> {
  // --- REPLACED ENDPOINT for latest rate ---
  app.get(
    '/api/rates/:currency/latest',
    async (req: Request, res: Response) => {
      const currencyCode = req.params.currency.toLowerCase();
      const filePath = path.join(DATA_DIR, `${currencyCode}.csv`);
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
    },
  );

  // --- REPLACED ENDPOINT for historical rates ---
  app.get('/api/rates', async (req: Request, res: Response) => {
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

    const cachedData =
      cache.get<Record<string, RateRecordResponse[]>>(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    try {
      const data = await getRatesForCurrencies(
        currencyCodes,
        startDate,
        endDate,
      );
      cache.set(cacheKey, data);
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching currency data:', error);
      return res
        .status(500)
        .json({ error: 'An internal server error occurred.' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
