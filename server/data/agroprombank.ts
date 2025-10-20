import axios from 'axios';

// Represents a single currency rate that has both buy and sell (commercial rates)
interface BuySellRate {
  /** Internal ID of the rate entry (matches the numeric key in JSON) */
  id: string;
  /** Currency code, e.g., USD, EUR */
  cc: string;
  /** Description in Russian, e.g., "Доллар США" */
  descr: string;
  /** Buy rate (Покупка) */
  value_buy: string;
  /** Sell rate (Продажа) */
  value_sell: string;
}

// Represents a single currency rate that has only a single official value
interface OfficialRate {
  /** Internal ID of the rate entry */
  id: string;
  /** Currency code */
  cc: string;
  /** Description in Russian */
  descr: string;
  /** Single official value (used for OR) */
  value: string;
}

// Generic type for a mapping of numeric IDs to rate entries
type RateMap<T> = {
  [key: string]: T;
};

// Represents one section of the response, e.g., CR, IB, OR, etc.
interface CurrencySection<T> {
  /** Mapping of numeric IDs to currency rates */
  rates: RateMap<T>;
  /** Date of the rates in format DD.MM.YYYY */
  date: string;
  /** Number of rates found or true if just a boolean flag (like OR) */
  found: number | boolean;
}

// Full typed response from the API
interface CurrencyResponse {
  /** Cash/commercial rates */
  CR: CurrencySection<BuySellRate>;
  /** Cash/commercial rates for commission deduction (similar to CR) */
  CRK: CurrencySection<BuySellRate>;
  /** Internet banking rates (APB Online) */
  IB: CurrencySection<BuySellRate>;
  /** Consumer credit rates (usually only USD) */
  PTC: CurrencySection<BuySellRate>;
  /** Official/reference rates (only `value` field) */
  OR: CurrencySection<OfficialRate>;
}

async function fetchCurrencyRates(date: Date): Promise<CurrencyResponse> {
  const url = `https://www.agroprombank.com/includes/histratesnew.php?type=all&date=${encodeURIComponent(
    date.toLocaleDateString('ru-RU'),
  )}&json=1`;

  const response = await axios.get<CurrencyResponse>(url, {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.5',
      connection: 'keep-alive',
      referer: 'https://www.agroprombank.com/eshche/poleznoe/kursy-valyut/',
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    },
    // Include cookies if needed
    withCredentials: true,
  });

  return response.data;
}

async function main() {
  try {
    const date = new Date();
    const data = await fetchCurrencyRates(date);

    // print buy and sell of each cash/commercial rate
    console.log('Cash/Commercial Rates (CR):');
    for (const rateId in data.CR.rates) {
      const rate = data.CR.rates[rateId];
      console.log(
        `${rate.cc} (${rate.descr}): Buy = ${rate.value_buy}, Sell = ${rate.value_sell}`,
      );
    }

    // print official rates
    console.log('\nOfficial Rates (OR):');
    for (const rateId in data.OR.rates) {
      const rate = data.OR.rates[rateId];
      console.log(`${rate.cc} (${rate.descr}): Value = ${rate.value}`);
    }

    // print spread % between buy and sell for cash/commercial rates
    console.log('\nSpread % for Cash/Commercial Rates (CR):');
    for (const rateId in data.CR.rates) {
      const rate = data.CR.rates[rateId];
      const buy = Number.parseFloat(rate.value_buy.replace(',', '.'));
      const sell = Number.parseFloat(rate.value_sell.replace(',', '.'));
      const spread = ((sell - buy) / buy) * 100;
      console.log(`${rate.cc} (${rate.descr}): Spread = ${spread.toFixed(2)}%`);
    }
  } catch (error) {
    console.error('Error fetching currency rates:', error);
  }
}

main();
