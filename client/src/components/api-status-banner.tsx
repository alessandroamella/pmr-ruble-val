import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import ReactGA from 'react-ga4';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ApiStatusBannerProps {
  isError: boolean;
  isLoading: boolean;
}

export function ApiStatusBanner({ isError, isLoading }: ApiStatusBannerProps) {
  useEffect(() => {
    if (isError) {
      // This is a general name for this banner
      ReactGA.event('api_error', {
        api_endpoint: 'official-rates',
      });
    }
  }, [isError]);

  if (isLoading) {
    return (
      <Alert
        className="border-accent/50 bg-accent/5"
        data-testid="alert-api-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        <AlertTitle>Loading Currency Data</AlertTitle>
        <AlertDescription>
          Fetching latest exchange rates from the API...
        </AlertDescription>
      </Alert>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" data-testid="alert-api-error">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>API Connection Issue</AlertTitle>
        <AlertDescription>
          Unable to connect to the currency data API. Please try refreshing the
          page.
        </AlertDescription>
      </Alert>
    );
  }

  // return (
  //   <Alert
  //     className="border-chart-1/50 bg-chart-1/5"
  //     data-testid="alert-api-success"
  //   >
  //     <CheckCircle className="h-4 w-4 text-chart-1" />
  //     <AlertTitle>Connected</AlertTitle>
  //     <AlertDescription>
  //       Successfully connected to currency data API. Displaying live rates.
  //     </AlertDescription>
  //   </Alert>
  // );
  return null;
}
