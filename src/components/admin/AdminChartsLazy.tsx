"use client";

import dynamic from "next/dynamic";

// Canvas drawing code (AdminCharts.tsx) is deferred into its own chunk and
// only fetched/executed after the rest of the page has hydrated. Charts are
// decorative (no SEO value, require the browser to draw regardless), so
// `ssr: false` also skips producing empty <canvas> markup server-side.
// `ssr: false` requires this to happen inside a Client Component — see
// node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md.
export const AdminLineChart = dynamic(
  () => import("./AdminCharts").then((mod) => mod.AdminLineChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[190px] w-full animate-pulse rounded-lg bg-[#eef2f6]" />
    ),
  },
);

export const AdminSparkline = dynamic(
  () => import("./AdminCharts").then((mod) => mod.AdminSparkline),
  {
    ssr: false,
    loading: () => <div className="mt-3 h-8 w-full animate-pulse rounded bg-[#eef2f6]" />,
  },
);
