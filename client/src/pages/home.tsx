import type { LatestRate } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const today = new Date();
  const [mounted, setMounted] = useState(false);

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
      <header className="border-b bg-card/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Transnistrian Ruble Exchange Rates
            </h1>
            <p className="text-base text-muted-foreground">
              Data for {format(today, 'MMMM d, yyyy')} • Live PMR exchange rates
              and historical trends
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-8">
        {/* API Status Banner */}
        <ApiStatusBanner
          isError={eurError || usdError}
          isLoading={eurLoading && usdLoading && !eurError && !usdError}
        />

        {/* Exchange Rate Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* EUR Card */}
          <Card className="border-card-border" data-testid="card-rate-eur">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <span className="text-muted-foreground">PMR</span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                <span>EUR</span>
              </CardTitle>
              <CardDescription>Transnistrian Ruble to Euro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {eurLoading ? (
                <>
                  <Skeleton className="h-14 w-40" />
                  <Skeleton className="h-4 w-32" />
                </>
              ) : eurRate ? (
                <>
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
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No data available
                </p>
              )}
            </CardContent>
          </Card>

          {/* USD Card */}
          <Card className="border-card-border" data-testid="card-rate-usd">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <span className="text-muted-foreground">PMR</span>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                <span>USD</span>
              </CardTitle>
              <CardDescription>
                Transnistrian Ruble to US Dollar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {usdLoading ? (
                <>
                  <Skeleton className="h-14 w-40" />
                  <Skeleton className="h-4 w-32" />
                </>
              ) : usdRate ? (
                <>
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
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's Full Data Table */}
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              Today's Exchange Rates
            </CardTitle>
            <CardDescription>
              Complete overview of all available currency pairs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RatesTable />
          </CardContent>
        </Card>

        {/* Historical Chart Section */}
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Historical Trends
            </CardTitle>
            <CardDescription>
              Analyze exchange rate movements over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HistoricalChart />
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          <p className="text-sm text-muted-foreground text-center">
            Transnistrian Ruble Exchange Rate Dashboard • Data updated daily
          </p>
        </div>
      </footer>
    </div>
  );
}
