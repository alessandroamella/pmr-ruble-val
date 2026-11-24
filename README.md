# PMR Ruble value

A small dashboard that displays live and historical exchange rates for the Transnistrian Ruble (also denoted as PRB) against major currencies (EUR, USD, RUB, UAH, MDL). The application fetches data from an external API and presents it through interactive charts and tables, optimized for both desktop analysis and mobile quick-checks.

Data is scraped from the [Pridnestrovian Republican Bank](https://www.cbpmr.net/?lang=en) website.

### Setup

1. Clone this repository.
2. Install dependencies:

   ```bash
   pnpm install
   ```

   Note: if you have a Chromium-based browser installed and don't want Puppeteer to download its own version, set `CHROMIUM_PATH` in your `.env` (e.g. `CHROMIUM_PATH=/usr/bin/google-chrome-stable`) before running the install command: `.puppeteerrc.cjs` then skips the download and the scraper uses that browser. Pick a browser version close to the one Puppeteer targets.

3. Create a `.env` file in the root directory and set the environment variables needed, as specified in the schema under `.server/config/envs.ts`.
4. Initialize the database schema:

   ```bash
   pnpm db:push-schema
   ```

   This will create a `rates.db` (or your path specified by `DATABASE_URL` env variable) SQLite database file in the project root with the necessary tables. Note that the tables will be empty at this point; the scraper will populate them over time.

5. If you have pre-existing historical data in a CSV file (old versions of this project used to R/W to CSV files), you can import it into the database with:

   ```bash
   pnpm db:push-csv-data
   ```

6. To run the development server:

   ```bash
   pnpm dev
   ```

   This will run the server with both the backend (scrapers, API, DB connection) and the frontend (Vite + React). They are all served under the same Express server.

7. To build for production:
   ```bash
   pnpm build
   ```
8. To start the production server (after building):
   ```bash
   pnpm start
   ```

### Structure

- `/server` - backend code (Express server, scrapers, database models, etc.)
- `/client` - frontend code (React components, pages, styles, etc.)
- `/scripts` - utility scripts for database management, data import/export, etc.

### How the scraping works

Right now it fetches data from the [official bank](<(https://www.cbpmr.net/?lang=en)>) and 3 other commercial banks:

- Agroprombank
- EximBank
- PrisBank

Each bank has its own scraper module that adheres to the `IExchangeRateProvider` interface. Some of them do an Axios call and parse the HTML with Cheerio, others run a full headless Chrome via [rebrowser-puppeteer](https://github.com/rebrowser/rebrowser-patches), a drop-in Puppeteer fork that patches common automation leaks (EximBank has a 'FOXCLOUD protection' page that returns a 503 and redirects via JavaScript after a few seconds; a real browser that waits for the rates table gets through, no stealth plugins needed).

Data from commercial banks is cached with a simple in-memory cache (with `node-cache`) for 6 hours, as it's unlikely that exchange rates will change more often than that.

While data from the official bank is fetched every day at 2AM server time with a cron job (using `node-cron`), and only the saved time is returned to clients.

### Support the project

If you find this project useful and would like to support its development, consider donating via Ko-fi. Every contribution is greatly appreciated and helps keep the project running. Thank you!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/K3K11NB5XR)
