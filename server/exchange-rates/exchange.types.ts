/**
 * The standard, normalized structure for a single currency's exchange rates.
 * The rates are always for one unit of the currency.
 */
export interface NormalizedExchangeRate {
  buy: number;
  sell: number;
}

/**
 * The standard, normalized structure for a collection of currency rates.
 * It's a dictionary mapping currency codes (e.g., "USD") to their rates.
 */
export type NormalizedRates = Record<string, NormalizedExchangeRate>;

/**
 * The standard, normalized result object that every provider must return.
 * This ensures consistency regardless of the data source.
 */
export interface ProviderResult {
  bankName: string;
  /** The date for which the rates are valid, in 'YYYY-MM-DD' format. */
  date: string;
  /** The collection of normalized currency rates. */
  rates: NormalizedRates;
  /** The original source URL or API endpoint for reference. */
  source: string;
}

/**
 * Defines the "contract" that every exchange rate provider must follow.
 * Any class that fetches exchange rates should implement this interface.
 */
export interface IExchangeRateProvider {
  /** A unique, human-readable name for the provider (e.g., "EximBank"). */
  readonly name: string;

  /**
   * The core method to fetch and normalize exchange rates.
   * @param date - An optional date for which to fetch rates. Not all providers may support this.
   * @returns A Promise that resolves to a standardized ProviderResult.
   */
  getRates(date?: Date | string): Promise<ProviderResult>;
}
