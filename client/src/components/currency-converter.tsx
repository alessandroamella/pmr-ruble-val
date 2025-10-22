import { AVAILABLE_CURRENCIES } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { flatMap, uniq } from 'lodash';
import { ArrowRight, ArrowUpLeft, ArrowUpRight, Info } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import type { ProviderResult } from 'server/exchange-rates/exchange.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PMRRubleIcon } from '@/components/ui/pmr-ruble-icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function CurrencyConverter() {
  // 1. Data Fetching
  const {
    data: allBankRates,
    isLoading,
    isError,
  } = useQuery<ProviderResult[]>({
    queryKey: ['/api/exchange-rates'],
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  });

  // 2. State Management
  const [amount, setAmount] = useState('100');
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [direction, setDirection] = useState<
    'foreign-to-pmr' | 'pmr-to-foreign'
  >('foreign-to-pmr');

  const availableCurrencies = useMemo(() => {
    if (isLoading || !allBankRates) return [];
    // use lodash, return AVAILABLE_CURRENCIES filtered by those present in allBankRates
    const currenciesInData = uniq(
      flatMap(allBankRates, (bank) => Object.keys(bank.rates)),
    ).map((code) => code.toLowerCase());

    return AVAILABLE_CURRENCIES.filter((currency) =>
      currenciesInData.includes(currency.code),
    );
  }, [isLoading, allBankRates]);

  const inputId = useId();

  // 3. Memoized values
  const currencyOptions = useMemo(() => {
    return availableCurrencies.map((currency) => ({
      value: currency.code.toUpperCase(),
      label: `${currency.code.toUpperCase()} - ${currency.name}`,
    }));
  }, [availableCurrencies]);

  const isForeignToPMR = direction === 'foreign-to-pmr';

  // 4. Conversion Logic
  const resultsByBank = useMemo(() => {
    if (isLoading || !allBankRates || allBankRates.length === 0) {
      return [];
    }
    const numericAmount = Number.parseFloat(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return allBankRates.map((b) => ({
        bankName: b.bankName,
        bankUrl: b.bankUrl,
        result: '0.0000',
      }));
    }

    return allBankRates.map((bank) => {
      const rateData = bank.rates[selectedCurrency];
      if (!rateData) {
        return {
          bankName: bank.bankName,
          bankUrl: bank.bankUrl,
          result: 'N/A',
        };
      }

      let finalResult = 0;
      if (isForeignToPMR) {
        // User has foreign currency, wants PMR. Bank BUYS foreign currency.
        finalResult = numericAmount * rateData.buy;
      } else {
        // User has PMR, wants foreign currency. Bank SELLS foreign currency.
        finalResult = numericAmount / rateData.sell;
      }

      return {
        bankName: bank.bankName,
        bankUrl: bank.bankUrl,
        result: finalResult > 0 ? finalResult.toFixed(4) : '0.0000',
      };
    });
  }, [amount, selectedCurrency, allBankRates, isLoading, isForeignToPMR]);

  const maxResult = useMemo(() => {
    // lowest if foreign-to-pmr (we want to pay less foreign currency)
    // highest if pmr-to-foreign (we want to get more foreign currency)
    const validResults = resultsByBank
      .map((r) => Number.parseFloat(r.result))
      .filter((val) => !Number.isNaN(val));

    if (validResults.length === 0) return null;

    return Math.max(...validResults);
  }, [resultsByBank]);

  // --- Render Logic ---

  if (isLoading) {
    return <CurrencyConverterSkeleton />;
  }

  if (isError) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardHeader>
          <CardTitle>Converter Unavailable</CardTitle>
          <CardDescription>
            Could not load commercial exchange rate data.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-card-border hover:bg-card/90 transition-colors">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Converter</CardTitle>
        <CardDescription>
          Convert between PMR Rubles (PRB) and other currencies using the most
          recent exchange rates across commercial banks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* --- Main Conversion UI (Static Layout) --- */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col md:flex-row w-full items-center md:items-end lg:gap-x-6 gap-4 justify-center max-w-sm md:justify-between">
            {/* Left side is Foreign Currency */}
            <div className="flex flex-col items-center gap-2 text-center">
              <Label className="text-base font-medium">Foreign Currency</Label>
              <Select
                value={selectedCurrency}
                onValueChange={setSelectedCurrency}
              >
                <SelectTrigger
                  className="w-[140px]"
                  data-testid="select-currency"
                >
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="shrink-0 scale-125"
              onClick={() =>
                setDirection(
                  isForeignToPMR ? 'pmr-to-foreign' : 'foreign-to-pmr',
                )
              }
              aria-label="Swap conversion direction"
            >
              <ArrowRight
                className={cn(
                  'h-5 w-5 transition-transform rotate-90 md:rotate-0 duration-300',
                  !isForeignToPMR && '-rotate-90 md:rotate-180',
                )}
              />
            </Button>

            {/* Right side is PMR Ruble */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
                <span className="text-sm font-medium">PMR Ruble</span>
                <PMRRubleIcon className="h-5 w-5 inline" />
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-2 pt-2">
            <Label htmlFor={inputId}>Amount to Convert</Label>
            <Input
              id={inputId}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100.00"
              min="0"
              className="text-center text-xl h-12"
            />
          </div>
        </div>

        <Separator />

        {/* --- Results List --- */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 space-y-2 mb-2 md:mb-0 items-center md:justify-items-start justify-items-center">
            <h3 className="text-lg font-medium">
              {/* PMRRubleIcon */}
              You Will Receive (
              {isForeignToPMR ? <span>PRB</span> : selectedCurrency})
            </h3>
            {isForeignToPMR ? (
              <Badge className="w-fit md:mx-auto bg-green-600/20 text-green-800 dark:text-green-300 hover:bg-green-600/30 border-green-600/30">
                You Sell {selectedCurrency}
              </Badge>
            ) : (
              <Badge className="w-fit md:mx-auto bg-red-600/20 text-red-800 dark:text-red-300 hover:bg-red-600/30 border-red-600/30">
                You Buy {selectedCurrency}
              </Badge>
            )}
            <div className="hidden md:flex md:ml-auto text-lg font-medium items-center gap-2">
              <span
                className={cn({
                  'text-muted-foreground': isForeignToPMR,
                })}
              >
                {selectedCurrency}
              </span>
              <ArrowUpRight
                className={cn('w-4 h-4', {
                  hidden: !isForeignToPMR,
                })}
              />
              <ArrowUpLeft
                className={cn('w-4 h-4', {
                  hidden: isForeignToPMR,
                })}
              />
              <span
                className={cn({
                  'text-muted-foreground': !isForeignToPMR,
                })}
              >
                <PMRRubleIcon className="inline-block mb-1" /> PRB
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {resultsByBank.map(({ bankName, bankUrl, result }) => (
              <div
                key={bankName}
                className="flex items-center justify-between rounded-md bg-muted/50 p-3"
              >
                <a
                  href={bankUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-primary/80 transition-colors"
                >
                  {bankName}
                </a>
                <p
                  className={cn(
                    'font-mono text-lg font-semibold tracking-tight',
                    {
                      'text-green-600':
                        maxResult !== null &&
                        Number.parseFloat(result) === maxResult,
                    },
                  )}
                >
                  {result}
                </p>
              </div>
            ))}
          </div>
          <div className="text-sm text-foreground/70 text-center mt-2">
            <Info className="w-4 h-4 inline-block mr-1 mb-1" />
            The <span className="text-green-600/90">best</span> rate is{' '}
            highlighted in green.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// A dedicated skeleton component for the static layout
function CurrencyConverterSkeleton() {
  return (
    <Card className="border-card-border">
      <CardHeader>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <div className="flex flex-col items-center gap-4">
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-end gap-4">
            {/* Left Skeleton */}
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-36" />
            </div>
            {/* Arrow Skeleton */}
            <Skeleton className="h-10 w-10 rounded-md" />
            {/* Right Skeleton */}
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
          <div className="w-full max-w-sm space-y-2 pt-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>

        <Separator />

        {/* Skeleton for the results list */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-52" />
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
