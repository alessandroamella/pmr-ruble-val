import 'dotenv/config';

import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';
import { envs } from './config/envs';
import { startExchangeRatesCronJob } from './exchange-rates/exchange-rates.service';
import { startOfficialRatesCronJob } from './official-data/cron-updater';
import { registerRoutes } from './routes';
import { log, serveStatic, setupVite } from './vite';

const app = express();

if (envs.NODE_ENV === 'production') {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // too hard to nonce all the things, allow unsafe-inline for scripts/styles
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: [
            "'self'",
            'https://fonts.googleapis.com',
            "'unsafe-inline'",
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          connectSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https://www.ruble.pm/'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          baseUri: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
    }),
  );
} else {
  // In development, keep CSP disabled for Vite HMR and dev tooling
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined;

  const originalResJson = res.json;
  res.json = (bodyJson, ...args) => {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = `${logLine.slice(0, 79)}…`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Start the cron job to keep currency data fresh
  startOfficialRatesCronJob();

  // Start the exchange rates cache refresh cron job
  startExchangeRatesCronJob();

  const server = await registerRoutes(app);

  app.use(
    (
      err: Error & {
        status?: number;
        statusCode?: number;
      },
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';

      console.error(`Error encountered: ${message}`, err);

      res.status(status).json({ message });
      // throw err;
    },
  );

  if (app.get('env') === 'development') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = envs.SERVER_PORT;
  server.listen(
    {
      port,
      host: '0.0.0.0',
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
