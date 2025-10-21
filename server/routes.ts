import { createServer, type Server } from 'node:http';
import type { Express } from 'express';
import exchangeRatesRoutes from './exchange-rates/exchange-rates.controller.ts';
import officialDataRoutes from './official-data/official-data.controller.ts';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  app.use('/api/official-rates', officialDataRoutes);
  app.use('/api/exchange-rates', exchangeRatesRoutes);

  return httpServer;
}
