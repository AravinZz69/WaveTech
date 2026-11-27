"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV === "development") {
      if (metric.value > 2000 && metric.name === "LCP") {
        console.debug("[WebVitals]", metric.name, Math.round(metric.value));
      }
      return;
    }
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const body = JSON.stringify({
        name: metric.name,
        value: Math.round(metric.value),
        rating: metric.rating,
      });
      navigator.sendBeacon("/api/vitals", body);
    }
  });

  return null;
}
