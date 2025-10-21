import axios from 'axios';
import type {
  IExchangeRateProvider,
  NormalizedRates,
  ProviderResult,
} from '../exchange.types';

// --- API-Specific Type Definitions ---
// It's best to keep these types here, as they are unique to this provider's API response.

interface ApiBuySellRate {
  cc: string; // e.g., "USD"
  value_buy: string; // e.g., "16.30"
  value_sell: string; // e.g., "16.35"
}

interface ApiCurrencySection {
  rates: Record<string, ApiBuySellRate>;
  date: string; // Format: "DD.MM.YYYY"
}

interface ApiCurrencyResponse {
  /** Cash/commercial rates (our target) */
  CR: ApiCurrencySection;
  // We can ignore the other sections like CRK, IB, etc. for this provider.
}

// A helper function to format date correctly for this specific API
function formatDateForApi(date: Date | string): string {
  // The API expects DD.MM.YYYY
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('ru-RU'); // This conveniently gives "dd.mm.yyyy"
}

// A helper function to normalize the date from the API response
function normalizeDateFromApi(apiDate: string): string {
  // The API returns DD.MM.YYYY, we want YYYY-MM-DD
  const parts = apiDate.split('.');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return apiDate; // Fallback in case the format changes
}

export class AgroPromBankProvider implements IExchangeRateProvider {
  readonly name = 'AgroPromBank';
  private readonly baseUrl =
    'https://www.agroprombank.com/includes/histratesnew.php';

  /**
   * Fetches and normalizes currency exchange rates from the Agroprombank API.
   * @param date - The date for which to fetch rates. Defaults to today if not provided.
   * @returns A Promise that resolves to a standardized ProviderResult.
   */
  async getRates(date: Date | string = new Date()): Promise<ProviderResult> {
    const apiDateString = formatDateForApi(date);
    const url = `${this.baseUrl}?type=all&date=${encodeURIComponent(
      apiDateString,
    )}&json=1`;

    try {
      // 1. Fetch data from the API
      const response = await axios.get<ApiCurrencyResponse>(url, {
        headers: {
          // It's good practice to include headers that mimic a browser if the API is sensitive
          Referer: 'https://www.agroprombank.com/eshche/poleznoe/kursy-valyut/',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        },
      });

      const cashRatesSection = response.data.CR;
      if (!cashRatesSection || !cashRatesSection.rates) {
        throw new Error(
          "API response did not contain 'CR' (Cash Rates) section.",
        );
      }

      // 2. Transform the API data into our normalized structure
      const rates: NormalizedRates = {};
      // The rates are in an object, we just need the values
      for (const apiRate of Object.values(cashRatesSection.rates)) {
        if (apiRate.cc && apiRate.value_buy && apiRate.value_sell) {
          rates[apiRate.cc] = {
            buy: Number.parseFloat(apiRate.value_buy),
            sell: Number.parseFloat(apiRate.value_sell),
          };
        }
      }

      // 3. Return the standardized result object
      return {
        bankName: this.name,
        date: normalizeDateFromApi(cashRatesSection.date),
        rates: rates,
        source: url,
      };
    } catch (error) {
      console.error(`[${this.name}] Error fetching or parsing rates:`, error);
      throw new Error(`Failed to retrieve exchange rates from ${this.name}.`);
    }
  }
}
