import { isValid, parseISO } from 'date-fns';
import cron from 'node-cron';
import { redisCacheService } from 'server/services/cache.service';
import { logger } from 'server/utils/logger';
import type { ProviderResult } from './exchange.types';
import { providers } from './providers';

const CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours in seconds
const CRON_SCHEDULE = '0 */3 * * *'; // Every 3 hours at minute 0

// Track in-flight requests to prevent concurrent fetches for the same provider
const inFlightRequests = new Map<string, Promise<ProviderResult>>();

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
      const cached = await redisCacheService.get<ProviderResult>(cacheKey);

      if (cached) {
        return cached;
      }

      // Check if there's already an in-flight request for this provider
      const inFlightKey = `${cacheKey}-${date || 'current'}`;
      const existingRequest = inFlightRequests.get(inFlightKey);
      if (existingRequest) {
        logger.info(`Reusing in-flight request for ${provider.name}`);
        return existingRequest;
      }

      // Create new request and track it
      const requestPromise = provider
        .getRates(date)
        .then((result) => {
          redisCacheService.set(cacheKey, result, CACHE_TTL_SECONDS);
          inFlightRequests.delete(inFlightKey);
          return result;
        })
        .catch((error) => {
          inFlightRequests.delete(inFlightKey);
          throw error;
        });

      inFlightRequests.set(inFlightKey, requestPromise);
      return requestPromise;
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
      logger.error('A provider failed to fetch rates:', result.reason);
    }
  });

  logger.info(`Fetched rates from ${successfulRates.length} providers`);

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
  const cached = await redisCacheService.get<ProviderResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Check if there's already an in-flight request for this provider
  const inFlightKey = `${cacheKey}-${date || 'current'}`;
  const existingRequest = inFlightRequests.get(inFlightKey);
  if (existingRequest) {
    logger.info(`Reusing in-flight request for ${provider.name}`);
    return existingRequest;
  }

  // Create new request and track it
  const requestPromise = provider
    .getRates(date)
    .then((result) => {
      logger.info(`Fetched rates from ${provider.name}`);
      redisCacheService.set(cacheKey, result, CACHE_TTL_SECONDS);
      inFlightRequests.delete(inFlightKey);
      return result;
    })
    .catch((error) => {
      inFlightRequests.delete(inFlightKey);
      throw error;
    });

  inFlightRequests.set(inFlightKey, requestPromise);
  return requestPromise;
};

/**
 * Gets all available provider names.
 * @returns Array of provider names.
 */
export const getAvailableProviders = (): string[] => {
  return Array.from(providers.keys());
};

/**
 * Cron job that refreshes cache for all providers for the predefined schedule.
 * Runs at: 00:00, 06:00, 12:00, 18:00
 */
export const startExchangeRatesCronJob = () => {
  cron.schedule(CRON_SCHEDULE, async () => {
    logger.info('Starting scheduled cache refresh for all providers...');
    try {
      await fetchAllProviderRates();
      logger.info('Scheduled cache refresh completed successfully');
    } catch (error) {
      logger.error('Error during scheduled cache refresh:', error);
    }
  });

  logger.info(
    `Banks exchange rates cache refresh cron job started with pattern "${CRON_SCHEDULE}"`,
  );
};
