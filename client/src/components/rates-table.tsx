import { AVAILABLE_CURRENCIES, type LatestRate } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function RatesTable() {
  // Fetch all latest rates
  const queries = AVAILABLE_CURRENCIES.map((currency) => ({
    queryKey: [`/api/rates/${currency.code}/latest`],
    currency,
  }));

  const results = queries.map(({ queryKey, currency }) => ({
    currency,
    query: useQuery<LatestRate>({ queryKey }),
  }));

  const isLoading = results.some((r) => r.query.isLoading);

  return (
    <div className="md:rounded-md border-t md:border border-card-border overflow-x-hidden">
      <div className="max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Currency</TableHead>
              <TableHead className="font-semibold">Code</TableHead>
              <TableHead className="font-semibold text-right">
                Exchange Rate
              </TableHead>
              <TableHead className="font-semibold">Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? // Loading state
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-24 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                  </TableRow>
                ))
              : results.map(({ currency, query }) => (
                  <TableRow
                    key={currency.code}
                    className="hover-elevate"
                    data-testid={`row-currency-${currency.code}`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: currency.color }}
                        />
                        {currency.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="font-mono uppercase"
                      >
                        {currency.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {query.data ? (
                        <span
                          className="font-mono font-semibold text-base"
                          data-testid={`text-rate-${currency.code}`}
                        >
                          {Number.parseFloat(query.data.rate).toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          N/A
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {query.data
                        ? format(new Date(query.data.date), 'MMM d, yyyy')
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
