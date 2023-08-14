# Using [Core Web Vitals](https://web.dev/vitals/)

Core Web Vitals are a set of metrics that measure the experience of using your application. In contrast with Quilt’s [built-in performance tracking features](../features/performance.md#navigation), Core Web Vitals primarily measure experience of your app’s initial page load. These two sources of metrics are complementary, and many apps will benefit from tracking both.

Google provides the [`web-vitals`](https://github.com/GoogleChrome/web-vitals) package for tracking Core Web Vitals on your app’s front-end. This guide will show how to use this package in a Quilt application. If you don’t already have an app, the easiest way to get started is to follow the [app creation guide](../getting-started.md#creating-an-app). Once you have an app, you’ll need to install the `web-vitals` package:

```bash
# npm
npm install --save-dev web-vitals
# pnpm
pnpm install --save-dev web-vitals
# yarn
yarn add --dev web-vitals
```

Each template app comes with a `Metrics` component. In the single-file app template, this component is part of the `App.tsx` file. In all other templates, this component is located in `foundation/Metrics/Metrics.tsx`. The default templates come with a bit of reporting about [navigation timing](../features/performance.md#navigation), but this is a fine place to also add our Core Web Vitals reporting.

Find your metrics `Metrics` component, and add the Core Web Vitals listeners for the metrics you want to track in a `useEffect` hook:

```tsx
import {useEffect} from 'react';
import {onLCP, onFID, onCLS, type Metric} from 'web-vitals';
import {
  usePerformanceNavigationEvent,
  type PropsWithChildren,
} from '@quilted/quilt';

export function Metrics({children}) {
  useEffect(() => {
    onLCP(handleMetric);
    onFID(handleMetric);
    onCLS(handleMetric);

    function handleMetric(metric: Metric) {
      // Send the metric to your analytics service
      console.log('Core Web Vital:');
      console.log(metric);
    }
  }, []);

  // Existing code for tracking navigation timing. Leave it as-is, so that we record
  // both Core Web Vitals and timing for all client-side navigations.
  usePerformanceNavigationEvent(() => {
    /* ... */
  });

  return <>{children}</>;
}
```

The [`web-vitals` README](https://github.com/GoogleChrome/web-vitals/tree/main#usage) has specific examples of handling these metrics, including how to send them to popular analytics services. Any instructions for using the `web-vitals` package will work with this integration, though you will need to adapt any examples that use browser APIs (such as `navigator.sendBeacon()`) to run as part of the `useEffect()` hook where we start listening for metrics.
