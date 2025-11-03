import { URLSearchParams } from 'node:url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { formatDate } from 'date-fns';
import { logger } from 'server/utils/logger';
import { sleep } from 'server/utils/sleep';

// --- SHARED CONSTANTS AND INTERFACES ---

export const CURRENCIES: { [code: string]: string } = {
  '840': 'US dollar',
  '978': 'Euro',
  '826': 'GB pound',
  '643': 'Russian rouble',
  '980': 'Ukrainian grivna',
  '498': 'Moldavian lei',
  '756': 'Swiss Franc',
  '985': 'Zloty',
  '208': 'Danish Krone',
  '578': 'Norwegian Krona',
  '752': 'Swedish Krona',
  '348': 'Hungarian Forint',
  '975': 'Bulgarian Lev',
  '946': 'Romanian Lei',
  '376': 'New Israeli Shekel',
  '949': 'New Turkish Lira',
  '392': 'Japanese Yen',
  '974': 'Belorussian Rouble (old)',
  '933': 'Belorussian Rouble',
  '972': 'Tajikistan Somoni',
  '398': 'Kazak Tenge',
  '944': 'Azeri Manat',
  '554': 'The New Zealand dollar',
  '156': 'Yuan',
  '51': 'Armenian Dram',
  '36': 'Australian dollar',
  '124': 'Canadian Dollar',
  '344': 'Hong Kong Dollar',
  '203': 'Czech krone',
  '784': 'UAE Dirham',
  '941': 'Serbian Dinar',
  '356': 'Indian Rupee',
};

export interface RateRecord {
  date: string;
  currency_code: string;
  currency_name: string;
  letter_code: string;
  units: number;
  rate: number;
}
// --- CORE SCRAPING FUNCTIONS ---

export async function fetchCurrencyData(
  currencyCode: string,
  currencyName: string,
  fromDate: Date,
  toDate: Date,
  timeout?: number,
): Promise<RateRecord[]> {
  const url = 'https://www.cbpmr.net/kurs_val.php?lang=en';
  const records: RateRecord[] = [];

  const formData = new URLSearchParams();
  formData.append('day_in', String(fromDate.getDate()));
  formData.append('mount_in', String(fromDate.getMonth() + 1).padStart(2, '0'));
  formData.append('year_in', String(fromDate.getFullYear()));
  formData.append('day_out', String(toDate.getDate()));
  formData.append('mount_out', String(toDate.getMonth() + 1).padStart(2, '0'));
  formData.append('year_out', String(toDate.getFullYear()));
  formData.append('val[]', currencyCode);
  formData.append('submit', 'Show');

  const headers = {
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'max-age=0',
    'Content-Type': 'application/x-www-form-urlencoded',
    Origin: 'https://www.cbpmr.net',
    Referer: 'https://www.cbpmr.net/kursval.php?lang=en',
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  };

  try {
    const response = await axios.post(url, formData.toString(), {
      headers,
      timeout,
    });
    const $ = cheerio.load(response.data);

    $('td[width="80%"] h8:contains("Exchange rates from")').each(
      (_, element) => {
        const h8 = $(element);
        const dateText = h8.text().replace('Exchange rates from', '').trim();

        if (!dateText) return;

        const [day, month, year] = dateText.split('.');
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const table = h8.nextAll('table.simple-little-table').first();

        if (table.length > 0) {
          const row = table.find('tbody tr:last-child');
          const letterCode = row.find('td:nth-child(4) h12').text().trim();
          const unitsText = row.find('td:nth-child(5) h12').text().trim();
          const rateText = row.find('td:nth-child(6) h12').text().trim();

          const rate = Number.parseFloat(rateText);
          const units = Number.parseInt(unitsText, 10);

          if (formattedDate && !Number.isNaN(rate) && !Number.isNaN(units)) {
            records.push({
              date: formattedDate,
              currency_code: currencyCode,
              currency_name: currencyName,
              letter_code: letterCode,
              units: units,
              rate: rate,
            });
          }
        }
      },
    );
  } catch (error) {
    logger.error(
      `Error fetching data for ${currencyName} (${currencyCode}):`,
      error,
    );
    // In a real app, you might want to throw the error to be handled by the caller
  }

  return records;
}

/**
 * Fetches data for ALL currencies within a date range and returns it as a single array.
 * @param fromDate The start date for the query.
 * @param toDate The end date for the query.
 * @returns A promise that resolves to an array of RateRecord objects for all currencies.
 */
export async function getAllCurrencyDataAsJson(
  fromDate: Date,
  toDate: Date,
): Promise<RateRecord[]> {
  logger.info(
    `Fetching all currency data from ${formatDate(fromDate, 'yyyy-MM-dd')} to ${formatDate(toDate, 'yyyy-MM-dd')}`,
  );

  const allRecords: RateRecord[] = [];

  for (const [code, name] of Object.entries(CURRENCIES)) {
    logger.info(` -> Fetching: ${name}`);
    const currencyRecords = await fetchCurrencyData(
      code,
      name,
      fromDate,
      toDate,
    );
    allRecords.push(...currencyRecords);
    await sleep(500); // Shorter delay for API context, but still polite
  }

  // Sort all records chronologically
  allRecords.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.currency_name.localeCompare(b.currency_name),
  );

  logger.info(`Finished fetching. Total records: ${allRecords.length}`);
  return allRecords;
}
