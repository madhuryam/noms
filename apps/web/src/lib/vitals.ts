/**
 * Core Web Vitals measurement and reporting
 * Measures LCP, FID, CLS, FCP, and TTFB
 */

type MetricName = 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB' | 'INP';

interface Metric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

type ReportHandler = (metric: Metric) => void;

// Thresholds for Core Web Vitals (in ms except CLS which is unitless)
const thresholds: Record<MetricName, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
  INP: [200, 500],
};

function getRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const [good, poor] = thresholds[name];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Log a metric to the console with color coding
 */
function logMetric(metric: Metric) {
  const colors = {
    good: 'color: #10b981',
    'needs-improvement': 'color: #f59e0b',
    poor: 'color: #ef4444',
  };

  const unit = metric.name === 'CLS' ? '' : 'ms';

  console.log(
    `%c[${metric.name}] ${metric.value.toFixed(metric.name === 'CLS' ? 3 : 0)}${unit} (${metric.rating})`,
    colors[metric.rating]
  );
}

/**
 * Report a web vital metric
 */
function reportWebVital(name: MetricName, value: number, id: string, delta: number): Metric {
  const rating = getRating(name, value);
  const metric: Metric = { name, value, rating, delta, id };

  if (import.meta.env.DEV) {
    logMetric(metric);
  }

  return metric;
}

/**
 * Initialize Core Web Vitals measurement
 * Uses the web-vitals library pattern but with native APIs for smaller bundle
 */
export function initWebVitals(onReport?: ReportHandler) {
  if (typeof window === 'undefined') return;

  // First Contentful Paint
  const paintObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        const metric = reportWebVital('FCP', entry.startTime, 'fcp', entry.startTime);
        onReport?.(metric);
      }
    }
  });

  try {
    paintObserver.observe({ type: 'paint', buffered: true });
  } catch {
    // Safari doesn't support buffered flag
  }

  // Largest Contentful Paint
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as PerformancePaintTiming;
    if (lastEntry) {
      const metric = reportWebVital('LCP', lastEntry.startTime, 'lcp', lastEntry.startTime);
      onReport?.(metric);
    }
  });

  try {
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // Not supported
  }

  // First Input Delay
  const fidObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const fidEntry = entry as PerformanceEventTiming;
      const value = fidEntry.processingStart - fidEntry.startTime;
      const metric = reportWebVital('FID', value, 'fid', value);
      onReport?.(metric);
    }
  });

  try {
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch {
    // Not supported
  }

  // Cumulative Layout Shift
  let clsValue = 0;
  let clsEntries: PerformanceEntry[] = [];

  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Only count layout shifts without recent input
      if (!(entry as LayoutShift).hadRecentInput) {
        clsEntries.push(entry);
        clsValue += (entry as LayoutShift).value;
      }
    }
  });

  try {
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Not supported
  }

  // Report CLS on page hide
  const reportCLS = () => {
    if (clsValue > 0) {
      const metric = reportWebVital('CLS', clsValue, 'cls', clsValue);
      onReport?.(metric);
    }
  };

  // Visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      reportCLS();
      lcpObserver.disconnect();
    }
  });

  // Page hide (for back/forward cache)
  window.addEventListener('pagehide', reportCLS);

  // Time to First Byte
  const navigationEntries = performance.getEntriesByType(
    'navigation'
  ) as PerformanceNavigationTiming[];
  if (navigationEntries.length > 0) {
    const nav = navigationEntries[0];
    const ttfb = nav.responseStart - nav.requestStart;
    if (ttfb > 0) {
      const metric = reportWebVital('TTFB', ttfb, 'ttfb', ttfb);
      onReport?.(metric);
    }
  }
}

// Type for layout shift entries
interface LayoutShift extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

// Type for event timing entries
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
}
