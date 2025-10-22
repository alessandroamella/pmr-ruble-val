import { type Request, type Response, Router } from 'express';
import {
  fetchAllProviderRates,
  fetchProviderRates,
  getAvailableProviders,
  isValidDateString,
} from './exchange-rates.service';

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

  try {
    const successfulRates = await fetchAllProviderRates(date);
    res.status(200).json(successfulRates);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch rates from providers.',
      details:
        error instanceof Error ? error.message : 'An unknown error occurred.',
    });
  }
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

  // Validate the date query parameter if it exists.
  if (date && !isValidDateString(date)) {
    return res.status(400).json({
      error: "Invalid date format. Please use 'YYYY-MM-DD'.",
    });
  }

  try {
    const rates = await fetchProviderRates(providerName, date);

    if (!rates) {
      return res.status(404).json({
        error: `Provider '${providerName}' not found.`,
        availableProviders: getAvailableProviders(),
      });
    }

    res.status(200).json(rates);
  } catch (error) {
    // If the provider's getRates method throws an error, we catch it here.
    // 502 Bad Gateway is appropriate when an upstream service (our provider) fails.
    res.status(502).json({
      error: `Failed to fetch rates from ${providerName}.`,
      details:
        error instanceof Error ? error.message : 'An unknown error occurred.',
    });
  }
});

export default router;
