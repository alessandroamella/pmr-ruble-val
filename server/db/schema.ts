import {
  index,
  primaryKey,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const exchangeRates = sqliteTable(
  'exchange_rates',
  {
    // YYYY-MM-DD format, which is text but sortable and indexable
    date: text('date').notNull(),
    // e.g., 'usd', 'eur'
    currencyCode: text('currency_code').notNull(),
    // The actual exchange rate
    rate: real('rate').notNull(),
  },
  (table) => {
    return {
      // Composite Primary Key: Ensures one entry per currency per day.
      pk: primaryKey({ columns: [table.currencyCode, table.date] }),

      // This index is crucial for fast lookups by currency and date range.
      currencyDateIdx: index('currency_date_idx').on(
        table.currencyCode,
        table.date,
      ),
    };
  },
);

// We can define types for convenience, Drizzle infers these automatically.
export type ExchangeRate = typeof exchangeRates.$inferSelect; // for reading
export type NewExchangeRate = typeof exchangeRates.$inferInsert; // for inserting
