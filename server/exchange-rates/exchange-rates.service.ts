import { isValid, parseISO } from 'date-fns';
import NodeCache from 'node-cache';
import cron from 'node-cron';
import type { ProviderResult } from './exchange.types';
import { providers } from './providers';

const CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours in seconds
const CRON_SCHEDULE = '0 */6 * * *'; // Every 6 hours at minute 0
export const cache = new NodeCache({
  stdTTL: CACHE_TTL_SECONDS,
  checkperiod: 60,
});

/**
 * Validates if a string is in the 'YYYY-MM-DD' format.
 * @param dateStr The date string to validate.
 * @returns `true` if the format is valid, otherwise `false`.
 */
export const isValidDateString = (dateStr: unknown): dateStr is string => {
  return typeof dateStr === 'string' && isValid(parseISO(dateStr));
};

/**
 * Fetches rates from all providers and updates the cache.
 * @param date Optional date string in 'YYYY-MM-DD' format.
 * @returns Array of successful provider results.
 */
export const fetchAllProviderRates = async (
  date?: string,
): Promise<ProviderResult[]> => {
  const allProviderPromises = Array.from(providers.values()).map(
    async (provider) => {
      const cacheKey = provider.name;
      const cached = cache.get<ProviderResult>(cacheKey);

      if (cached) {
        return cached;
      }

      const result = await provider.getRates(date);
      cache.set(cacheKey, result);
      return result;
    },
  );

  const results = await Promise.allSettled(allProviderPromises);

  // Separate the successful results from the errors.
  const successfulRates = results
    .filter(
      (result): result is PromiseFulfilledResult<ProviderResult> =>
        result.status === 'fulfilled',
    )
    .map((result) => result.value);

  // Log any providers that failed for debugging purposes.
  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error('A provider failed to fetch rates:', result.reason);
    }
  });

  console.log(`Fetched rates from ${successfulRates.length} providers`);

  return successfulRates;
};

/**
 * Fetches rates from a specific provider.
 * @param providerName The name of the provider.
 * @param date Optional date string in 'YYYY-MM-DD' format.
 * @returns Provider result or null if provider not found.
 */
export const fetchProviderRates = async (
  providerName: string,
  date?: string,
): Promise<ProviderResult | null> => {
  const provider = providers.get(providerName.toLowerCase());

  if (!provider) {
    return null;
  }

  const cacheKey = provider.name;

  // Check if we have cached data
  const cached = cache.get<ProviderResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const rates = await provider.getRates(date);
  console.log(`Fetched rates from ${provider.name}`);

  // Store the result in cache
  cache.set(cacheKey, rates);

  return rates;
};

/**
 * Gets all available provider names.
 * @returns Array of provider names.
 */
export const getAvailableProviders = (): string[] => {
  return Array.from(providers.keys());
};

/**
 * Cron job that refreshes cache for all providers every 6 hours.
 * Runs at: 00:00, 06:00, 12:00, 18:00
 */
export const startExchangeRatesCronJob = () => {
  // Run every 6 hours at minute 0
  cron.schedule(CRON_SCHEDULE, async () => {
    console.log('Starting scheduled cache refresh for all providers...');
    try {
      await fetchAllProviderRates();
      console.log('Scheduled cache refresh completed successfully');
    } catch (error) {
      console.error('Error during scheduled cache refresh:', error);
    }
  });

  console.log(
    `Banks exchange rates cache refresh cron job started with pattern "${CRON_SCHEDULE}"`,
  );
};
