import { isValid, parseISO } from 'date-fns';
import { type Request, type Response, Router } from 'express';
import NodeCache from 'node-cache';
import type { ProviderResult } from './exchange.types';
import { providers } from './providers';

// Initialize cache with a TTL of 6 hours
export const cache = new NodeCache({ stdTTL: 6 * 60 * 60, checkperiod: 60 });

/**
 * Validates if a string is in the 'YYYY-MM-DD' format.
 * @param dateStr The date string to validate.
 * @returns `true` if the format is valid, otherwise `false`.
 */
const isValidDateString = (dateStr: unknown): dateStr is string => {
  return typeof dateStr === 'string' && isValid(parseISO(dateStr));
};

const router = Router();

/**
 * @route   GET /
 * @desc    Get exchange rates from all available providers.
 * @access  Public
 * @query   ?date=YYYY-MM-DD (optional) - Fetches rates for a specific date.
 *          If omitted, fetches the latest available rates.
 */
router.get('/', async (req: Request, res: Response) => {
  const { date } = req.query;

  // Validate the date query parameter if it exists
  if (date && !isValidDateString(date)) {
    return res.status(400).json({
      error: "Invalid date format. Please use 'YYYY-MM-DD'.",
    });
  }

  // Fetch rates from all registered providers concurrently.
  // Using Promise.allSettled ensures that if one provider fails, the others can still return results.
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

  // Optional: Log any providers that failed for debugging purposes.
  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error('A provider failed to fetch rates:', result.reason);
    }
  });

  console.log(
    `Fetched rates from ${successfulRates.length} providers`,
    ...successfulRates,
  );

  res.status(200).json(successfulRates);
});

/**
 * @route   GET /:providerName
 * @desc    Get exchange rates from a specific provider.
 * @access  Public
 * @param   providerName - The name of the provider (e.g., 'eximbank', 'prisbank'). Case-insensitive.
 * @query   ?date=YYYY-MM-DD (optional) - Fetches rates for a specific date.
 */
router.get('/:providerName', async (req: Request, res: Response) => {
  const { providerName } = req.params;
  const { date } = req.query;

  // Find the requested provider in our registry (case-insensitive).
  const provider = providers.get(providerName.toLowerCase());

  if (!provider) {
    return res.status(404).json({
      error: `Provider '${providerName}' not found.`,
      availableProviders: Array.from(providers.keys()),
    });
  }

  // Validate the date query parameter if it exists.
  if (date && !isValidDateString(date)) {
    return res.status(400).json({
      error: "Invalid date format. Please use 'YYYY-MM-DD'.",
    });
  }

  // Always cache the latest, regardless of date parameter
  const cacheKey = provider.name;

  // Check if we have cached data
  const cached = cache.get<ProviderResult>(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  try {
    const rates = await provider.getRates(date);
    // Store the result in cache
    cache.set(cacheKey, rates);
    res.status(200).json(rates);
  } catch (error) {
    // If the provider's getRates method throws an error, we catch it here.
    // 502 Bad Gateway is appropriate when an upstream service (our provider) fails.
    res.status(502).json({
      error: `Failed to fetch rates from ${provider.name}.`,
      details:
        error instanceof Error ? error.message : 'An unknown error occurred.',
    });
  }
});

export default router;
