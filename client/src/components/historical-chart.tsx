import {
  AVAILABLE_CURRENCIES,
  type CurrencyCode,
  type RatesResponse,
} from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { format, isAfter, isBefore, subYears } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function HistoricalChart() {
  const today = new Date();
  const oneYearAgo = subYears(today, 1);

  const [startDate, setStartDate] = useState<Date>(oneYearAgo);
  const [endDate, setEndDate] = useState<Date>(today);
  const [selectedCurrencies, setSelectedCurrencies] = useState<CurrencyCode[]>([
    'eur',
    'gbp',
    'usd',
  ]);

  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');

  // Fetch historical data
  const { data, isLoading, error } = useQuery<RatesResponse>({
    queryKey: [
      '/api/rates',
      {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        currencies: selectedCurrencies.join(','),
      },
    ],
    queryFn: async ({ queryKey }) => {
      const [path, params] = queryKey as [string, Record<string, string>];
      const queryParams = new URLSearchParams(params);
      const response = await fetch(`${path}?${queryParams.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: selectedCurrencies.length > 0,
  });

  // Transform data for the chart
  const chartData = useMemo(() => {
    if (!data) return [];

    // Get all unique dates
    const allDates = new Set<string>();
    Object.values(data).forEach((rates) => {
      rates.forEach((rate) => allDates.add(rate.date));
    });

    // Sort dates
    const sortedDates = Array.from(allDates).sort();

    // Create chart data points
    return sortedDates.map((date) => {
      const point: { date: string; [key: string]: number | string } = { date };

      selectedCurrencies.forEach((code) => {
        const rateData = data[code]?.find((r) => r.date === date);
        if (rateData) {
          point[code] = Number.parseFloat(rateData.rate);
        }
      });

      return point;
    });
  }, [data, selectedCurrencies]);

  const toggleCurrency = (code: CurrencyCode) => {
    setSelectedCurrencies((prev) => {
      if (prev.includes(code)) {
        // Don't allow deselecting all currencies
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== code);
      }
      return [...prev, code];
    });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap p-6 md:p-0">
        {/* Start Date */}
        <div className="flex-1 min-w-[200px]">
          <Label className="text-sm font-medium mb-2 block">From Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground',
                )}
                data-testid="button-start-date"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                disabled={(date) => isBefore(date, endDate)}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date */}
        <div className="flex-1 min-w-[200px]">
          <Label className="text-sm font-medium mb-2 block">To Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground',
                )}
                data-testid="button-end-date"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                selected={endDate}
                onSelect={(date) => date && setEndDate(date)}
                disabled={(date) => isAfter(date, startDate)}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Currency Selection */}
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
                      {selectedCurrencies.slice(0, 3).map((code) => {
                        const currency = AVAILABLE_CURRENCIES.find(
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
                      {selectedCurrencies.length > 3 && (
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
                  {AVAILABLE_CURRENCIES.map((currency) => (
                    <label
                      key={currency.code}
                      htmlFor={`currency-${currency.code}`}
                      className="flex items-center space-x-2 hover:bg-accent rounded-md p-2 cursor-pointer"
                    >
                      <Checkbox
                        id={`currency-${currency.code}`}
                        checked={selectedCurrencies.includes(currency.code)}
                        onCheckedChange={() => toggleCurrency(currency.code)}
                        data-testid={`checkbox-currency-${currency.code}`}
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

      {/* Chart */}
      <div
        className="-ml-10 sm:ml-0 w-[110%] sm:w-full overflow-x-hidden"
        data-testid="container-chart"
      >
        {isLoading ? (
          <div className="h-[400px] md:h-[500px] flex items-center justify-center">
            <div className="space-y-3 w-full px-8">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="h-[400px] md:h-[500px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Unable to load chart data. Please try again.
            </p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[400px] md:h-[500px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No data available for the selected date range.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => format(new Date(value), 'MMM d')}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--popover-border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--popover-foreground))',
                }}
                labelFormatter={(value) =>
                  format(new Date(value), 'MMMM d, yyyy')
                }
                formatter={(value: string, name: string) => [
                  Number.parseFloat(value).toFixed(4),
                  name.toUpperCase(),
                ]}
              />
              <Legend />
              {selectedCurrencies.map((code) => {
                const currency = AVAILABLE_CURRENCIES.find(
                  (c) => c.code === code,
                );
                if (!currency) return null;

                return (
                  <Line
                    key={code}
                    type="monotone"
                    dataKey={code}
                    stroke={currency.color}
                    strokeWidth={2}
                    dot={false}
                    name={currency.code.toUpperCase()}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
