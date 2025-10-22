import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { envs } from 'server/config/envs';
import { CURRENCIES_CSV_DATA_DIR } from 'server/official-data/currencies-csv-data-dir';
import type {
  IExchangeRateProvider,
  NormalizedRates,
  ProviderResult,
} from '../exchange.types';

puppeteer.use(StealthPlugin());

const tmpDir = join(CURRENCIES_CSV_DATA_DIR, '../tmp');

export class EximBankProvider implements IExchangeRateProvider {
  readonly name = 'EximBank';
  private readonly url = 'https://bankexim.com/';

  /**
   * Fetches and parses currency exchange rates from bankexim.com.
   * Note: This provider does not support fetching rates for a specific date;
   * it always fetches the current rates.
   * @param _date - This parameter is ignored.
   * @returns A Promise that resolves to a standardized ProviderResult.
   */
  async getRates(_date?: Date | string): Promise<ProviderResult> {
    const rates: NormalizedRates = {};
    let _browser: Browser | null = null;

    try {
      // 1. Launch browser and navigate to the page
      const browser = await puppeteer.launch({
        headless: envs.PUPPETEER_HEADLESS,
        // if empty string, puppeteer uses the bundled Chromium
        executablePath: envs.CHROMIUM_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      _browser = browser;
      const page = await browser.newPage();
      page.setViewport({ width: 1280, height: 800 }); // standard desktop size
      // set a 15 seconds timeout
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 20_000 });

      if (envs.TAKE_SCREENSHOTS) {
        if (!existsSync(tmpDir)) {
          await mkdir(tmpDir, { recursive: true });
        }
        await page.screenshot({
          path: `${join(tmpDir, 'eximbank_first_load')}.png`,
        });
      }

      // wait for the stupid auto anti bot
      await page.waitForSelector('.currencies_box .currencies_table tbody tr', {
        timeout: 20_000,
      });
      if (envs.TAKE_SCREENSHOTS) {
        await page.screenshot({
          path: `${join(tmpDir, 'eximbank_after_wait')}.png`,
        });
      }

      // 2. Extract currency data from the table
      const currencyData = await page.evaluate(() => {
        const rows = document.querySelectorAll(
          '.currencies_box .currencies_table tbody tr',
        );
        const data: Array<{ code: string; buy: string; sell: string }> = [];

        rows.forEach((row) => {
          const tds = row.querySelectorAll('td');
          if (tds.length >= 3) {
            data.push({
              code: tds[0]?.textContent?.trim() || '',
              buy: tds[1]?.textContent?.trim() || '',
              sell: tds[2]?.textContent?.trim() || '',
            });
          }
        });

        return data;
      });

      // 3. Parse and store the data in the normalized format
      for (const { code, buy, sell } of currencyData) {
        if (code && buy && sell) {
          rates[code] = {
            buy: Number.parseFloat(buy),
            sell: Number.parseFloat(sell),
          };
        }
      }

      if (Object.keys(rates).length === 0) {
        throw new Error('Failed to parse any currency rates from the page.');
      }

      // 4. Return the standardized result object
      return {
        bankName: this.name,
        // Since the site doesn't specify a date, we use today's date.
        date: new Date().toISOString().split('T')[0],
        rates: rates,
        bankUrl: 'https://bankexim.com/',
      };
    } catch (error) {
      console.error(`[${this.name}] Error fetching or parsing rates:`, error);
      throw new Error(`Failed to retrieve exchange rates from ${this.name}.`);
    } finally {
      // 5. Always close the browser
      if (_browser) {
        await _browser.close();
      }
    }
  }
}
