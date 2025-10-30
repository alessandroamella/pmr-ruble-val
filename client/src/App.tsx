import { QueryClientProvider } from '@tanstack/react-query';
import ReactGA from 'react-ga4';
import { Route, Switch } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import Home from '@/pages/home';
import NotFound from '@/pages/not-found';
import { Ga4PageViewTracker } from './components/ga4-page-view-tracker';
import { queryClient } from './lib/queryClient';

declare global {
  interface Window {
    gtag?: (
      event: string,
      action: string,
      params: Record<string, unknown>,
    ) => void;
  }
}

const ga4MeasurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID;
if (ga4MeasurementId) {
  ReactGA.initialize(ga4MeasurementId);
} else {
  console.warn(
    'GA4 Measurement ID is not set. Google Analytics will not be initialized.',
  );
}

const gAdsSendTo = import.meta.env.VITE_GADS_SEND_TO;

if (window.gtag && gAdsSendTo) {
  window.gtag('event', 'conversion', {
    send_to: gAdsSendTo,
  });
} else {
  if (!window.gtag) {
    console.warn(
      'gtag function is not available. Google Ads conversion tracking will not work.',
    );
  }
  if (!gAdsSendTo) {
    console.warn(
      'Google Ads send_to ID is not set. Google Ads conversion tracking will not work.',
    );
  }
}

function Router() {
  return (
    <>
      <Ga4PageViewTracker />
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
