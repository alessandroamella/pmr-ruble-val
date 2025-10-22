import type {
  IExchangeRateProvider,
  NormalizedRates,
  ProviderResult,
} from '../exchange.types';

// We can keep the specific API response types here as they are unique to this provider.
interface PrisBankCurrencyRate {
  abbr: string;
  buy: number;
  sale: number;
  tarif: number;
}
interface PrisBankRateCategory {
  id: number;
  name: string;
  courses: PrisBankCurrencyRate[];
}
type PrisBankResponse = PrisBankRateCategory[];

export class PrisBankProvider implements IExchangeRateProvider {
  readonly name = 'PrisBank';
  private readonly baseUrl = 'https://api.prisbank.com';
  // We are interested in "Cash Rates", which have ID 2
  private readonly cashRatesCategoryId = 2;

  /**
   * Fetches and normalizes currency exchange rates from the Prisbank API.
   * @param date - The date for which to fetch rates. Defaults to today if not provided.
   * @returns A Promise that resolves to a standardized ProviderResult.
   */
  async getRates(date: Date | string = new Date()): Promise<ProviderResult> {
    const dateString =
      date instanceof Date ? date.toISOString().split('T')[0] : date;

    const url = new URL('/courses', this.baseUrl);
    url.searchParams.append('date', dateString);

    try {
      // 1. Fetch data from the API
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      const data = (await response.json()) as PrisBankResponse;

      // 2. Find the specific category we need ("Cash Rates")
      const cashRatesCategory = data.find(
        (category) => category.id === this.cashRatesCategoryId,
      );

      if (!cashRatesCategory) {
        throw new Error(
          `Could not find 'Cash Rates' (ID: ${this.cashRatesCategoryId}) in API response.`,
        );
      }

      // 3. Transform the API data into our normalized structure
      const rates: NormalizedRates = {};
      for (const course of cashRatesCategory.courses) {
        // IMPORTANT: Normalize the rate by dividing by the 'tarif'
        rates[course.abbr] = {
          buy: course.buy / course.tarif,
          sell: course.sale / course.tarif,
        };
      }

      // 4. Return the standardized result object
      return {
        bankName: this.name,
        date: dateString,
        rates: rates,
        bankUrl: 'https://prisbank.com',
      };
    } catch (error) {
      console.error(`[${this.name}] Error fetching or parsing rates:`, error);
      throw new Error(`Failed to retrieve exchange rates from ${this.name}.`);
    }
  }
}
