// Puppeteer install/runtime config.
// If CHROMIUM_PATH is set (in the environment or in .env), the app uses that
// browser, so skip downloading puppeteer's own Chrome on `pnpm install`.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

function chromiumPathFromDotenv() {
  try {
    const env = readFileSync(join(__dirname, '.env'), 'utf8');
    const match = env.match(/^\s*CHROMIUM_PATH\s*=\s*["']?([^"'\r\n#]*)/m);
    return match?.[1]?.trim() || '';
  } catch {
    return '';
  }
}

const chromiumPath = process.env.CHROMIUM_PATH || chromiumPathFromDotenv();

/** @type {import("puppeteer").Configuration} */
module.exports = {
  skipDownload: Boolean(chromiumPath),
};
