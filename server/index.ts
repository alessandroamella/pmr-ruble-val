// server/index.ts

import 'dotenv/config';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import helmet from 'helmet';
import permissionsPolicy from 'permissions-policy';
import { envs } from './config/envs';
import { startExchangeRatesCronJob } from './exchange-rates/exchange-rates.service';
import { startOfficialRatesCronJob } from './official-data/cron-updater';
import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

async function startServer() {
  const app = express();
  const isProduction = envs.NODE_ENV === 'production';

  // --- Middleware di base ---
  if (isProduction) {
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              'https://www.googletagmanager.com',
            ],
            styleSrc: [
              "'self'",
              'https://fonts.googleapis.com',
              "'unsafe-inline'",
            ],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            connectSrc: [
              "'self'",
              'https://www.google-analytics.com',
              'https://analytics.google.com',
              'https://*.google-analytics.com',
              'https://region1.google-analytics.com',
              'https://www.google.com',
              'https://www.googleadservices.com',
              'https://googleads.g.doubleclick.net',
              'https://www.google.it',
            ],
            imgSrc: [
              "'self'",
              'data:',
              'https://www.ruble.pm',
              'https://www.google-analytics.com',
              'https://www.google.com',
              'https://storage.ko-fi.com',
              'https://googleads.g.doubleclick.net',
              'https://www.googleadservices.com',
              'https://www.google.it',
            ],
            frameSrc: ['https://www.googletagmanager.com'],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            formAction: ["'self'"],
            baseUri: ["'self'"],
          },
        },
      }),
    );
    app.use(
      permissionsPolicy({
        features: {
          fullscreen: [],
          payment: [],
          'sync-xhr': [],
        },
      }),
    );
  } else {
    app.use(helmet({ contentSecurityPolicy: false }));
  }

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // --- Logger per le richieste API ---
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      return next();
    }
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // --- Avvio dei Cron Job ---
  startOfficialRatesCronJob();
  startExchangeRatesCronJob();

  // --- Registrazione delle rotte API ---
  const server = await registerRoutes(app);
  log('API routes registered');

  // --- Gestione Frontend (Vite Dev Server o File Statici) ---
  if (isProduction) {
    // In produzione, serviamo i file statici della build
    serveStatic(app);
  } else {
    // In sviluppo, usiamo il middleware di Vite
    await setupVite(app, server);
  }

  // --- Gestione Errori (deve essere l'ultimo middleware) ---
  app.use(
    (
      err: Error & { status?: number; statusCode?: number },
      _req: Request,
      res: Response,
      _next: NextFunction, // eslint-disable-line
    ) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';
      console.error(`Error encountered: ${message}`, err.stack);
      res.status(status).json({ error: { message } });
    },
  );

  // --- Avvio del server ---
  const port = envs.SERVER_PORT;
  server.listen({ port, host: '0.0.0.0' }, () => {
    log(`Server listening on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
