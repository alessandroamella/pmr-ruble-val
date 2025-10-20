import type { LatestRate } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { auto as followSystemColorScheme } from 'darkreader';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowUpRight, Info, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiStatusBanner } from '@/components/api-status-banner';
import { HistoricalChart } from '@/components/historical-chart';
import { RatesTable } from '@/components/rates-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PMRRubleIcon } from '@/components/ui/pmr-ruble-icon';
import { Skeleton } from '@/components/ui/skeleton';
import flagImg from '../../assets/flag.svg';

// --- Framer Motion Variants ---

// For staggering the main content blocks on page load
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// For each individual content block
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 12,
    },
  },
};

// For animating content inside cards (e.g., from skeleton to data)
const contentVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3 },
};

export default function Home() {
  const today = new Date();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    followSystemColorScheme({});
    return () => {
      followSystemColorScheme(false);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch latest EUR rate
  const {
    data: eurRate,
    isLoading: eurLoading,
    isError: eurError,
  } = useQuery<LatestRate>({
    queryKey: ['/api/rates/eur/latest'],
    retry: 2,
  });

  // Fetch latest USD rate
  const {
    data: usdRate,
    isLoading: usdLoading,
    isError: usdError,
  } = useQuery<LatestRate>({
    queryKey: ['/api/rates/usd/latest'],
    retry: 2,
  });

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="border-b bg-card/50"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground flex flex-col sm:flex-row items-center gap-3">
              <img
                src={flagImg}
                alt="Transnistria Flag"
                className="w-24 sm:w-16 h-auto mt-1 sm:mt-0 mb-2 md:mb-0"
              />
              <p>Transnistrian Ruble Exchange Rates</p>
            </h1>
            <p className="text-base text-muted-foreground">
              Data for {format(today, 'MMMM d, yyyy')} • Live
              Transnistrian/Pridnestrovian Ruble (
              <PMRRubleIcon /> / руб/р) exchange rates and historical trends.
            </p>
            <p className="text-xs text-muted-foreground">
              Data from{' '}
              <a
                href="https://www.cbpmr.net/?lang=en"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                Pridnestrovian Republican Bank
              </a>
              .
            </p>
          </div>
        </div>
      </motion.header>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-8 space-y-8"
      >
        {/* API Status Banner */}
        <motion.div variants={itemVariants}>
          <ApiStatusBanner
            isError={eurError || usdError}
            isLoading={eurLoading && usdLoading && !eurError && !usdError}
          />
        </motion.div>

        {/* Exchange Rate Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* EUR Card */}
          <motion.div variants={itemVariants}>
            <Card
              className="border-card-border hover:bg-card/90 transition-colors"
              data-testid="card-rate-eur"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <span>EUR</span>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">PMR</span>
                </CardTitle>
                <CardDescription>Euro to Transnistrian Ruble</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 h-24">
                <AnimatePresence mode="wait">
                  {eurLoading ? (
                    <motion.div key="skeleton-eur" {...contentVariants}>
                      <Skeleton className="h-14 w-40" />
                      <Skeleton className="h-4 w-32 mt-2" />
                    </motion.div>
                  ) : eurRate ? (
                    <motion.div key="data-eur" {...contentVariants}>
                      <div
                        className="text-5xl font-mono font-bold"
                        data-testid="text-rate-eur"
                      >
                        {Number.parseFloat(eurRate.rate).toFixed(4)}
                      </div>
                      <p
                        className="text-xs text-muted-foreground"
                        data-testid="text-date-eur"
                      >
                        Updated: {format(new Date(eurRate.date), 'MMM d, yyyy')}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="error-eur" {...contentVariants}>
                      <p className="text-sm text-muted-foreground">
                        No data available
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* USD Card */}
          <motion.div variants={itemVariants}>
            <Card
              className="border-card-border hover:bg-card/90 transition-colors"
              data-testid="card-rate-usd"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <span>USD</span>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">PMR</span>
                </CardTitle>
                <CardDescription>
                  US Dollar to Transnistrian Ruble
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 h-24">
                <AnimatePresence mode="wait">
                  {usdLoading ? (
                    <motion.div key="skeleton-usd" {...contentVariants}>
                      <Skeleton className="h-14 w-40" />
                      <Skeleton className="h-4 w-32 mt-2" />
                    </motion.div>
                  ) : usdRate ? (
                    <motion.div key="data-usd" {...contentVariants}>
                      <div
                        className="text-5xl font-mono font-bold"
                        data-testid="text-rate-usd"
                      >
                        {Number.parseFloat(usdRate.rate).toFixed(4)}
                      </div>
                      <p
                        className="text-xs text-muted-foreground"
                        data-testid="text-date-usd"
                      >
                        Updated: {format(new Date(usdRate.date), 'MMM d, yyyy')}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="error-usd" {...contentVariants}>
                      <p className="text-sm text-muted-foreground">
                        No data available
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Today's Full Data Table */}
        <motion.div variants={itemVariants}>
          <Card className="border-card-border hover:bg-card/90 transition-colors">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">
                Today's Exchange Rates
              </CardTitle>
              <CardDescription>
                Overview of all published currencies.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
              <RatesTable />
            </CardContent>
          </Card>
        </motion.div>

        {/* Historical Chart Section */}
        <motion.div variants={itemVariants}>
          <Card className="border-card-border hover:bg-card/90 transition-colors">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Historical Trends
              </CardTitle>
              <CardDescription>
                Exchange rate trends for selected currencies against the
                Transnistrian Ruble.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
              <HistoricalChart />
            </CardContent>
          </Card>
        </motion.div>

        {/* USD Peg Information */}
        <motion.div variants={itemVariants}>
          <Card className="border-card-border hover:bg-muted/40 transition-colors bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <Info className="w-4 h-4 text-foreground mb-1 mr-1 inline " />
                The Transnistrian Ruble is de facto pegged to the US Dollar. The
                central bank evaluates daily whether adjustments to the exchange
                rate are necessary.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                <AlertTriangle className="w-4 h-4 text-foreground mb-1 mr-1 inline " />
                This website uses the term "Transnistrian Ruble" for clarity and
                recognizability, but the official name is "
                <strong>Pridnestrovian Ruble</strong>".
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          <p className="text-sm text-muted-foreground text-center">
            Transnistrian Ruble Exchange Rates • Data updated daily
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            A small project by{' '}
            <a
              href="https://www.bitrey.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              bitrey.dev
            </a>
            . Data sourced from the{' '}
            <a
              href="https://www.cbpmr.net/?lang=en"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              Pridnestrovian Republican Bank
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
