import { z } from 'zod';

// Currency rate data schemas
export const currencyRateSchema = z.object({
  date: z.string(),
  rate: z.string(),
});

export const latestRateSchema = z.object({
  date: z.string(),
  rate: z.string(),
});

export const ratesResponseSchema = z.record(z.array(currencyRateSchema));

// TypeScript types
export type CurrencyRate = z.infer<typeof currencyRateSchema>;
export type LatestRate = z.infer<typeof latestRateSchema>;
export type RatesResponse = z.infer<typeof ratesResponseSchema>;

// Available currencies for the dashboard
export const AVAILABLE_CURRENCIES = [
  { code: 'usd', name: 'US Dollar', symbol: '$', color: 'hsl(var(--chart-2))' },
  { code: 'eur', name: 'Euro', symbol: '€', color: 'hsl(var(--chart-1))' },
  {
    code: 'rub',
    name: 'Russian Ruble',
    symbol: '₽',
    color: 'hsl(var(--chart-3))',
  },
  {
    code: 'uah',
    name: 'Ukrainian Hryvnia',
    symbol: '₴',
    color: 'hsl(var(--chart-4))',
  },
  {
    code: 'mdl',
    name: 'Moldovan Leu',
    symbol: 'L',
    color: 'hsl(var(--chart-5))',
  },
] as const;

export type CurrencyCode = (typeof AVAILABLE_CURRENCIES)[number]['code'];
