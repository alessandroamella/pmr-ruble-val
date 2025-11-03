// server/vite.ts

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import path from 'node:path';
import express, { type Express, type Request, type Response } from 'express';
import { createLogger, createServer as createViteServer } from 'vite';
import viteConfig from '../vite.config';
import { logger } from './utils/logger';

const viteLogger = createLogger();

// Logger che usiamo anche in index.ts
export function log(message: string, source = 'express') {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  logger.info(`${formattedTime} [${source}] ${message}`);
}

/**
 * Imposta il middleware di Vite per l'ambiente di sviluppo.
 */
export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: 'custom',
  });

  // Usa i middleware di Vite. Questo gestirà l'HMR e servirà i file del client.
  app.use(vite.middlewares);

  // Catch-all per servire l'index.html processato da Vite.
  app.use('*', async (req: Request, res: Response, next) => {
    try {
      const url = req.originalUrl;
      const template = await vite.transformIndexHtml(
        url,
        await readFile(
          path.resolve(viteConfig.root as string, 'index.html'),
          'utf-8',
        ),
      );
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  log('Vite dev middleware-enabled');
}

/**
 * Configura Express per servire i file statici della build di produzione.
 */
export function serveStatic(app: Express) {
  // Il path è relativo a DOVE ESEGUI il file, quindi `dist/server.js`
  const clientBuildPath = path.resolve(import.meta.dirname, 'client');

  if (!existsSync(clientBuildPath)) {
    throw new Error(
      `Build directory not found: ${clientBuildPath}\nHave you run 'pnpm build'?`,
    );
  }

  log(`Serving static files from: ${clientBuildPath}`);

  // 1. Servi i file statici (JS, CSS, immagini, ecc.) dalla cartella di build.
  // `express.static` ignorerà le richieste che non corrispondono a un file.
  app.use(
    express.static(clientBuildPath, {
      maxAge: '1y', // Cache aggressiva per gli asset con hash
      immutable: true,
    }),
  );

  // 2. SPA Fallback: Per QUALSIASI altra richiesta GET che non è stata gestita
  //    prima (né dalle API, né da express.static), servi l'index.html.
  //    Questo permette al router client-side di prendere il controllo.
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(clientBuildPath, 'index.html'));
  });
}
