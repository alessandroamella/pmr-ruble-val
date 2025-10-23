import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import { createLogger, createServer as createViteServer } from 'vite';
import viteConfig from '../vite.config';

const viteLogger = createLogger();

export function log(message: string, source = 'express') {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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

  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    try {
      const template = await readFile(
        path.resolve(viteConfig.root as string, 'index.html'),
        'utf-8',
      );
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const __dirname =
    import.meta.dirname || path.dirname(fileURLToPath(import.meta.url));

  const clientPath = path.resolve(__dirname, 'client');

  if (!existsSync(clientPath)) {
    throw new Error(
      `Build directory not found: ${clientPath}\nRun: npm run build`,
    );
  }

  log(`Serving static files from: ${clientPath}`);

  // Serve static files with caching
  app.use(
    express.static(clientPath, {
      maxAge: '1y',
      immutable: true,
      index: false, // Don't auto-serve index.html
    }),
  );

  // SPA fallback - serve index.html for all non-file requests
  app.get('*', (req, res) => {
    // If URL has extension and we got here, file doesn't exist
    if (/\.\w+$/.test(req.path)) {
      return res.status(404).send('Not Found');
    }

    // Serve React app for all routes
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}
