import { AVAILABLE_CURRENCIES, type LatestRate } from '@shared/schema';
import { useQueries } from '@tanstack/react-query';
import { ArrowRightLeft } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PMRRubleIcon } from '@/components/ui/pmr-ruble-icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

// Reusable Currency Selector Component
interface CurrencySelectorProps {
  id: string;
  label: string;
  isPmr: boolean;
  selectedCurrency: string;
  onCurrencyChange: (value: string) => void;
  currencyOptions: Array<{ value: string; label: string }>;
}

const CurrencySelector = ({
  id,
  label,
  isPmr,
  selectedCurrency,
  onCurrencyChange,
  currencyOptions,
}: CurrencySelectorProps) => {
  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="text-sm font-medium text-muted-foreground pb-2 block"
      >
        {label}
      </label>
      {isPmr ? (
        <div className="h-9 px-3 py-2 rounded-md border border-input bg-muted/20 flex items-center justify-between font-medium">
          <Tooltip>
            <TooltipTrigger>
              <span className="flex items-center gap-2">
                <PMRRubleIcon className="w-4 h-4" />
                PMR{' '}
                <span className="hidden lg:inline-block">
                  - Transnistrian Ruble
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Use the{' '}
                <ArrowRightLeft className="h-4 w-4 inline-block mr-1 mb-1" />
                button to swap the conversion direction.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <Select value={selectedCurrency} onValueChange={onCurrencyChange}>
          <SelectTrigger id={id} data-testid="select-currency">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {currencyOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export function CurrencyConverter() {
  // 1. Data Fetching - Fetch all latest rates individually (same as RatesTable)
  const results = useQueries({
    queries: AVAILABLE_CURRENCIES.map((currency) => ({
      queryKey: [`/api/rates/${currency.code}/latest`],
      staleTime: 1000 * 60 * 5, // Cache rates for 5 minutes
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);

  // 2. State Management
  const [amount, setAmount] = useState('20');
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [isPmrToForeign, setIsPmrToForeign] = useState(false); // true: PMR → Foreign, false: Foreign → PMR
  const [result, setResult] = useState<string>('');

  // 3. Memoize currency options for the dropdown (excluding PMR)
  const currencyOptions = useMemo(() => {
    return AVAILABLE_CURRENCIES.map((currency) => ({
      value: currency.code.toUpperCase(),
      label: `${currency.code.toUpperCase()} - ${currency.name}`,
    }));
  }, []);

  // 4. Conversion Logic
  useEffect(() => {
    if (isLoading || !amount) {
      setResult('');
      return;
    }

    const numericAmount = Number.parseFloat(amount);
    if (Number.isNaN(numericAmount)) {
      setResult('');
      return;
    }

    // Helper to find rate data by currency code
    const findRateData = (code: string) => {
      const currencyIndex = AVAILABLE_CURRENCIES.findIndex(
        (c) => c.code.toUpperCase() === code.toUpperCase(),
      );
      if (currencyIndex === -1) return null;
      const queryResult = results[currencyIndex];
      return queryResult.data as LatestRate | undefined;
    };

    let finalResult = 0;

    const rateData = findRateData(selectedCurrency);
    if (rateData) {
      const ratePerOne = Number.parseFloat(rateData.rate);

      if (isPmrToForeign) {
        // PMR → Foreign: divide by rate
        finalResult = numericAmount / ratePerOne;
      } else {
        // Foreign → PMR: multiply by rate
        finalResult = numericAmount * ratePerOne;
      }
    }

    setResult(finalResult > 0 ? finalResult.toFixed(4) : '');
  }, [amount, selectedCurrency, isPmrToForeign, results, isLoading]);

  // 5. Swap Handler
  const handleSwap = () => {
    setIsPmrToForeign(!isPmrToForeign);
  };

  const amountId = useId();
  const fromId = useId();
  const toId = useId();

  // --- Render Logic ---

  if (isLoading) {
    return (
      <Card className="border-card-border">
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Skeleton className="h-10 w-full sm:flex-1" />
            <Skeleton className="h-10 w-full sm:flex-1" />
            <Skeleton className="h-10 w-10 shrink-0" />
            <Skeleton className="h-10 w-full sm:flex-1" />
          </div>
          <Skeleton className="h-12 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardHeader>
          <CardTitle>Currency Converter Unavailable</CardTitle>
          <CardDescription>
            Could not load the required exchange rate data. Please try again
            later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-card-border hover:bg-card/90 transition-colors">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold flex items-center gap-2">
          Converter
        </CardTitle>
        <CardDescription>
          Convert between PMR Rubles and other currencies using the most recent
          exchange rates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_1fr] items-end gap-2">
          {/* Amount Input */}
          <div className="w-full">
            <label
              htmlFor={amountId}
              className="text-sm font-medium text-muted-foreground pb-2 block"
            >
              Amount
            </label>
            <Input
              id={amountId}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100.00"
              min="0"
            />
          </div>

          {/* From Currency */}
          <CurrencySelector
            id={fromId}
            label="From"
            isPmr={isPmrToForeign}
            selectedCurrency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
            currencyOptions={currencyOptions}
          />

          {/* Swap Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwap}
            className="hidden md:flex mx-1 shrink-0 scale-125"
            aria-label="Swap currencies"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSwap}
            className="flex md:hidden mx-auto scale-125 mt-3 -mb-2 justify-center items-center"
            aria-label="Swap currencies"
          >
            <ArrowRightLeft className="h-4 w-4 inline-block" />
            Swap
          </Button>

          {/* To Currency */}
          <CurrencySelector
            id={toId}
            label="To"
            isPmr={!isPmrToForeign}
            selectedCurrency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
            currencyOptions={currencyOptions}
          />
        </div>

        {/* Result Display */}
        {result && amount && (
          <div className="pt-4 text-center sm:text-left">
            <p className="text-muted-foreground">
              {amount} {isPmrToForeign ? 'PMR' : selectedCurrency} equals
            </p>
            <p className="text-4xl font-bold font-mono tracking-tight flex items-center justify-center sm:justify-start gap-2">
              {result}
              <span className="text-3xl font-sans font-medium text-muted-foreground">
                {isPmrToForeign ? selectedCurrency : 'PMR'}
              </span>
              {!isPmrToForeign && <PMRRubleIcon className="w-7 h-7" />}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
