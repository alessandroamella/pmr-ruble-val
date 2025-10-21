import axios from 'axios';
import * as cheerio from 'cheerio';
import type {
  IExchangeRateProvider,
  NormalizedRates,
  ProviderResult,
} from '../exchange.types';

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

    try {
      // 1. Fetch the HTML content
      const { data: html } = await axios.get(this.url);
      const $ = cheerio.load(html);

      // 2. Select and iterate over table rows
      const tableRows = $('.currencies_box .currencies_table')
        .first()
        .find('tbody tr');

      tableRows.each((_index, element) => {
        const tds = $(element).find('td');
        const currencyCode = $(tds.eq(0)).text().trim();
        const buyRateStr = $(tds.eq(1)).text().trim();
        const sellRateStr = $(tds.eq(2)).text().trim();

        // 3. Clean, parse, and store the data in the normalized format
        if (currencyCode && buyRateStr && sellRateStr) {
          rates[currencyCode] = {
            buy: Number.parseFloat(buyRateStr),
            sell: Number.parseFloat(sellRateStr),
          };
        }
      });

      if (Object.keys(rates).length === 0) {
        throw new Error('Failed to parse any currency rates from the page.');
      }

      // 4. Return the standardized result object
      return {
        bankName: this.name,
        // Since the site doesn't specify a date, we use today's date.
        date: new Date().toISOString().split('T')[0],
        rates: rates,
        source: this.url,
      };
    } catch (error) {
      console.error(`[${this.name}] Error fetching or parsing rates:`, error);
      throw new Error(`Failed to retrieve exchange rates from ${this.name}.`);
    }
  }
}
