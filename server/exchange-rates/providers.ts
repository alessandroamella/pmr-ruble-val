import { AgroPromBankProvider } from './agroprombank';
import type { IExchangeRateProvider } from './exchange.types';
import { EximBankProvider } from './eximbank';
import { PrisBankProvider } from './prisbank';

// The key is a lowercase, URL-friendly version of the provider's name
const providers = new Map<string, IExchangeRateProvider>();

/**
 * Instantiate and register all available providers
 */
[
  new AgroPromBankProvider(),
  new EximBankProvider(),
  new PrisBankProvider(),
].forEach((provider) => {
  // Use a consistent, URL-friendly key (e.g., "agroprombank")
  providers.set(provider.name.toLowerCase(), provider);
});

export { providers };
