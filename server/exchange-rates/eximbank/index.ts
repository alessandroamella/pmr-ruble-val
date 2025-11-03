import { join } from 'node:path';
import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { envs } from 'server/config/envs';
import { tmpDir } from 'server/config/prepare-dirs';
import { logger } from 'server/utils/logger';
import type {
  IExchangeRateProvider,
  NormalizedRates,
  ProviderResult,
} from '../exchange.types';

puppeteer.use(StealthPlugin());

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
    let _page: Page | null = null;

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
      _page = page;

      await page.setUserAgent({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        // platform: 'Win32',
        // userAgentMetadata: {
        //   architecture: 'x86',
        //   model: '',
        //   platform: 'Windows',
        //   platformVersion: '10.0',
        //   mobile: false,
        // },
      });
      page.setViewport({ width: 1280, height: 800 });

      page.setViewport({ width: 1280, height: 800 }); // standard desktop size

      logger.info(`[${this.name}] Navigating to ${this.url}...`);

      // set a reasonable 30 seconds timeout
      await page.goto(this.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      if (envs.TAKE_SCREENSHOTS) {
        await page.screenshot({
          path: `${join(tmpDir, 'eximbank_first_load')}.png`,
        });
      }

      logger.info(`[${this.name}] Page loaded, extracting data...`);

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

      logger.info(
        `[${this.name}] Fetched ${Object.keys(rates).length} currency rates: ${Object.keys(
          rates,
        ).join(', ')}`,
      );

      // 4. Return the standardized result object
      return {
        bankName: this.name,
        // Since the site doesn't specify a date, we use today's date.
        date: new Date().toISOString().split('T')[0],
        rates: rates,
        bankUrl: 'https://bankexim.com/',
      };
    } catch (error) {
      logger.error(`[${this.name}] Error fetching or parsing rates:`, error);

      // if there is a page open, try to take a screenshot for debugging
      if (envs.TAKE_SCREENSHOTS) {
        try {
          if (_page) {
            await _page.screenshot({
              path: `${join(tmpDir, 'eximbank_error_from_page')}.png`,
            });
            logger.info(`[${this.name}] Error screenshot taken from page`);
          } else if (_browser) {
            const pages = await _browser.pages();
            if (pages.length > 0) {
              await pages[0].screenshot({
                path: `${join(tmpDir, 'eximbank_error)from_browser')}.png`,
              });
              logger.info(`[${this.name}] Error screenshot taken from browser`);
            } else {
              logger.warn(
                `[${this.name}] No pages found in browser to take screenshot from.`,
              );
            }
          } else {
            logger.warn(
              `[${this.name}] No browser instance available to take screenshot from.`,
            );
          }
        } catch (err) {
          logger.error(`[${this.name}] Failed to take error screenshot:`, err);
        }
      }

      throw new Error(`Failed to retrieve exchange rates from ${this.name}.`);
    } finally {
      // 5. Always close the browser
      if (_browser) {
        await _browser.close();
      }
    }
  }
}
