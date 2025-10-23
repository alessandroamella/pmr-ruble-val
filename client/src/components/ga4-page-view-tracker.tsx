import { useEffect } from 'react';
import ReactGA from 'react-ga4';
import { useLocation } from 'wouter';

export function Ga4PageViewTracker() {
  const [location] = useLocation();

  useEffect(() => {
    // Send a pageview event every time the location changes
    ReactGA.send({ hitType: 'pageview', page: location });
  }, [location]);

  return null; // This component doesn't render anything
}
