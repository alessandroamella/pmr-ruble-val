import {
  AVAILABLE_CURRENCIES,
  type CurrencyCode,
  type RatesResponse,
} from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { format, subYears } from 'date-fns';
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
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function HistoricalChart() {
  const today = new Date();
  const oneYearAgo = subYears(today, 1);

  const [startDate, setStartDate] = useState<Date>(oneYearAgo);
  const [endDate, setEndDate] = useState<Date>(today);
  const [selectedCurrencies, setSelectedCurrencies] = useState<CurrencyCode[]>([
    'usd',
    'eur',
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
      const point: any = { date };

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
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
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
                // The disabled logic now uses the `disabled` prop, which is mapped to `filterDate`
                disabled={(date) => endDate && date > endDate}
                // You can also use minDate/maxDate for better performance and accessibility
                // maxDate={endDate || undefined}
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
                // The disabled logic
                disabled={(date) =>
                  (startDate && date < startDate) || date > new Date()
                }
                // You can also use minDate/maxDate for better performance
                // minDate={startDate || undefined}
                // maxDate={new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Currency Selection */}
        <div className="flex-1 min-w-[200px]">
          <Label className="text-sm font-medium mb-2 block">Currencies</Label>
          <div className="flex flex-wrap gap-3">
            {AVAILABLE_CURRENCIES.map((currency) => (
              <div key={currency.code} className="flex items-center space-x-2">
                <Checkbox
                  id={`currency-${currency.code}`}
                  checked={selectedCurrencies.includes(currency.code)}
                  onCheckedChange={() => toggleCurrency(currency.code)}
                  data-testid={`checkbox-currency-${currency.code}`}
                />
                <Label
                  htmlFor={`currency-${currency.code}`}
                  className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: currency.color }}
                  />
                  {currency.code.toUpperCase()}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full" data-testid="container-chart">
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
                formatter={(value: any) => [
                  Number.parseFloat(value).toFixed(4),
                  '',
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
