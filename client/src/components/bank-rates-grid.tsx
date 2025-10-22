import { AVAILABLE_CURRENCIES, type CurrencyCode } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { flatMap, uniq } from 'lodash';
import { Building, Info, MinusCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ProviderResult } from 'server/exchange-rates/exchange.types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface BestRates {
  [currency: string]: {
    bestBuy: number;
    bestSell: number;
  };
}

const BankRateCard = ({
  bankData,
  bestRates,
  selectedCurrencies,
}: {
  bankData: ProviderResult;
  bestRates: BestRates;
  selectedCurrencies: CurrencyCode[];
}) => {
  // Display currencies in the order they were selected
  const displayCurrencies = selectedCurrencies.map((c) => c.toUpperCase());

  return (
    <Card className="border-none md:border-card-border flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5 text-muted-foreground" />
          {bankData.bankName}
        </CardTitle>
        <CardDescription>
          Rates as of {new Date(bankData.date).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right text-green-600 dark:text-green-400">
                Buy
              </TableHead>
              <TableHead className="text-right text-red-600 dark:text-red-400">
                Sell
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayCurrencies.map((code) => {
              const rates = bankData.rates[code];
              const hasData = !!rates;
              const isBestBuy =
                hasData &&
                bestRates[code] &&
                rates.buy === bestRates[code].bestBuy;
              const isBestSell =
                hasData &&
                bestRates[code] &&
                rates.sell === bestRates[code].bestSell;

              return (
                <TableRow key={code}>
                  <TableCell className="font-mono uppercase font-semibold">
                    {code}
                  </TableCell>
                  {hasData ? (
                    <>
                      <TableCell
                        className={cn('text-right font-mono', {
                          underline: isBestBuy,
                        })}
                      >
                        {rates.buy.toFixed(4)}
                      </TableCell>
                      <TableCell
                        className={cn('text-right font-mono', {
                          underline: isBestSell,
                        })}
                      >
                        {rates.sell.toFixed(4)}
                      </TableCell>
                    </>
                  ) : (
                    <TableCell
                      colSpan={2}
                      className="text-center text-muted-foreground"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <MinusCircle className="w-4 h-4" />
                        No data
                      </span>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export const BankRatesGrid = () => {
  const [selectedCurrencies, setSelectedCurrencies] = useState<CurrencyCode[]>([
    'eur',
    'usd',
    'rub',
  ]);

  const {
    data: bankRates,
    isLoading,
    isError,
  } = useQuery<ProviderResult[]>({
    queryKey: ['/api/exchange-rates'],
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  });

  // Calculate best rates across all banks for selected currencies
  const bestRates: BestRates = {};
  if (bankRates && bankRates.length > 0) {
    const displayCurrencies = selectedCurrencies.map((c) => c.toUpperCase());

    // Iterate through each currency
    for (const currencyCode of displayCurrencies) {
      const buyRates: number[] = [];
      const sellRates: number[] = [];

      // Collect all buy and sell rates for this currency across all banks
      for (const bank of bankRates) {
        if (bank.rates[currencyCode]) {
          buyRates.push(bank.rates[currencyCode].buy);
          sellRates.push(bank.rates[currencyCode].sell);
        }
      }

      // Best buy rate is the maximum (you get more PMR rubles)
      // Best sell rate is the minimum (you pay fewer PMR rubles)
      if (buyRates.length > 0 && sellRates.length > 0) {
        bestRates[currencyCode] = {
          bestBuy: Math.max(...buyRates),
          bestSell: Math.min(...sellRates),
        };
      }
    }
  }

  const toggleCurrency = (code: CurrencyCode) => {
    setSelectedCurrencies((prev) => {
      if (prev.includes(code)) {
        // Don't allow deselecting all currencies
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== code);
      }
      return [...prev, code].sort();
    });
  };

  const availableCurrencies = useMemo(() => {
    if (isLoading || !bankRates) return [];
    // use lodash, return AVAILABLE_CURRENCIES filtered by those present in bankRates
    const currenciesInData = uniq(
      flatMap(bankRates, (bank) => Object.keys(bank.rates)),
    ).map((code) => code.toLowerCase());

    return AVAILABLE_CURRENCIES.filter((currency) =>
      currenciesInData.includes(currency.code),
    );
  }, [isLoading, bankRates]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !bankRates || bankRates.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could Not Load Bank Rates</AlertTitle>
        <AlertDescription>
          There was an issue fetching the latest commercial exchange rates.
          Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2 md:space-y-6">
      <Card className="px-4 py-3 mx-3 text-sm border-card-border hover:bg-muted/40 transition-colors bg-muted/50">
        <Info className="w-4 h-4 inline-block mr-1 mb-1" />
        The best rates for each currency (lowest sell and highest buy) are{' '}
        <span className="underline">underlined</span> in each bank's table.
      </Card>

      {/* Currency Selection Control */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap p-6 md:p-0">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-sm font-medium mb-2 block">Currencies</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <span className="flex items-center gap-2 flex-wrap">
                  {selectedCurrencies.length > 0 ? (
                    <>
                      {selectedCurrencies.slice(0, 5).map((code) => {
                        const currency = availableCurrencies.find(
                          (c) => c.code === code,
                        );
                        return (
                          <Badge
                            key={code}
                            variant="secondary"
                            className="gap-1.5"
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: currency?.color }}
                            />
                            {code.toUpperCase()}
                          </Badge>
                        );
                      })}
                      {selectedCurrencies.length > 5 && (
                        <Badge variant="secondary">
                          +{selectedCurrencies.length - 3} more
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      Select currencies...
                    </span>
                  )}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <ScrollArea className="h-[300px]">
                <div className="p-4 space-y-2">
                  {availableCurrencies.map((currency) => (
                    <label
                      key={currency.code}
                      htmlFor={`currency-${currency.code}`}
                      className="flex items-center space-x-2 hover:bg-accent rounded-md p-2 cursor-pointer"
                    >
                      <Checkbox
                        id={`currency-${currency.code}`}
                        checked={selectedCurrencies.includes(currency.code)}
                        onCheckedChange={() => toggleCurrency(currency.code)}
                      />
                      <span className="flex items-center gap-2 flex-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: currency.color }}
                        />
                        <span className="text-xs font-light text-muted-foreground">
                          {currency.code.toUpperCase()}
                        </span>
                        <span className="text-sm font-normal">
                          {currency.name}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Bank Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankRates.map((bank) => (
          <BankRateCard
            key={bank.bankName}
            bankData={bank}
            bestRates={bestRates}
            selectedCurrencies={selectedCurrencies}
          />
        ))}
      </div>
    </div>
  );
};
