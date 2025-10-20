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
  { code: 'usd', name: 'US Dollar', symbol: '$', color: 'hsl(var(--chart-1))' },
  { code: 'eur', name: 'Euro', symbol: '€', color: 'hsl(var(--chart-2))' },
  { code: 'gbp', name: 'GB Pound', symbol: '£', color: 'hsl(var(--chart-3))' },
  {
    code: 'rub',
    name: 'Russian Ruble',
    symbol: '₽',
    color: 'hsl(var(--chart-4))',
  },
  {
    code: 'uah',
    name: 'Ukrainian Hryvnia',
    symbol: '₴',
    color: 'hsl(var(--chart-5))',
  },
  {
    code: 'mdl',
    name: 'Moldovan Leu',
    symbol: 'L',
    color: 'hsl(var(--chart-1))',
  },
  {
    code: 'chf',
    name: 'Swiss Franc',
    symbol: 'CHF',
    color: 'hsl(var(--chart-2))',
  },
  {
    code: 'pln',
    name: 'Polish Zloty',
    symbol: 'zł',
    color: 'hsl(var(--chart-3))',
  },
  {
    code: 'dkk',
    name: 'Danish Krone',
    symbol: 'kr',
    color: 'hsl(var(--chart-4))',
  },
  {
    code: 'nok',
    name: 'Norwegian Krone',
    symbol: 'kr',
    color: 'hsl(var(--chart-5))',
  },
  {
    code: 'sek',
    name: 'Swedish Krona',
    symbol: 'kr',
    color: 'hsl(var(--chart-1))',
  },
  {
    code: 'huf',
    name: 'Hungarian Forint',
    symbol: 'Ft',
    color: 'hsl(var(--chart-2))',
  },
  {
    code: 'bgn',
    name: 'Bulgarian Lev',
    symbol: 'лв',
    color: 'hsl(var(--chart-3))',
  },
  {
    code: 'ron',
    name: 'Romanian Leu',
    symbol: 'lei',
    color: 'hsl(var(--chart-4))',
  },
  {
    code: 'ils',
    name: 'Israeli Shekel',
    symbol: '₪',
    color: 'hsl(var(--chart-5))',
  },
  {
    code: 'try',
    name: 'Turkish Lira',
    symbol: '₺',
    color: 'hsl(var(--chart-1))',
  },
  {
    code: 'jpy',
    name: 'Japanese Yen',
    symbol: '¥',
    color: 'hsl(var(--chart-2))',
  },
  {
    code: 'byn',
    name: 'Belarusian Ruble',
    symbol: 'Br',
    color: 'hsl(var(--chart-3))',
  },
  {
    code: 'tjs',
    name: 'Tajikistani Somoni',
    symbol: 'ЅМ',
    color: 'hsl(var(--chart-4))',
  },
  {
    code: 'kzt',
    name: 'Kazakh Tenge',
    symbol: '₸',
    color: 'hsl(var(--chart-5))',
  },
  {
    code: 'azn',
    name: 'Azerbaijani Manat',
    symbol: '₼',
    color: 'hsl(var(--chart-1))',
  },
  {
    code: 'nzd',
    name: 'New Zealand Dollar',
    symbol: 'NZ$',
    color: 'hsl(var(--chart-2))',
  },
  {
    code: 'cny',
    name: 'Chinese Yuan',
    symbol: '¥',
    color: 'hsl(var(--chart-3))',
  },
  {
    code: 'amd',
    name: 'Armenian Dram',
    symbol: '֏',
    color: 'hsl(var(--chart-4))',
  },
  {
    code: 'aud',
    name: 'Australian Dollar',
    symbol: 'A$',
    color: 'hsl(var(--chart-5))',
  },
  {
    code: 'cad',
    name: 'Canadian Dollar',
    symbol: 'C$',
    color: 'hsl(var(--chart-1))',
  },
  {
    code: 'hkd',
    name: 'Hong Kong Dollar',
    symbol: 'HK$',
    color: 'hsl(var(--chart-2))',
  },
  {
    code: 'czk',
    name: 'Czech Koruna',
    symbol: 'Kč',
    color: 'hsl(var(--chart-3))',
  },
  {
    code: 'aed',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    color: 'hsl(var(--chart-4))',
  },
  {
    code: 'rsd',
    name: 'Serbian Dinar',
    symbol: 'дин',
    color: 'hsl(var(--chart-5))',
  },
  {
    code: 'inr',
    name: 'Indian Rupee',
    symbol: '₹',
    color: 'hsl(var(--chart-1))',
  },
] as const;

export type CurrencyCode = (typeof AVAILABLE_CURRENCIES)[number]['code'];
