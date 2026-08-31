"use client";

import { useEffect } from "react";
import { trackCatalogEvent } from "@/lib/analytics";

export function SearchAnalytics({ query, resultCount }: { query: string; resultCount: number }) {
  useEffect(() => {
    if (!query) return;
    trackCatalogEvent("search_submitted", { query, resultCount });
    if (resultCount === 0) trackCatalogEvent("search_zero_results", { query });
  }, [query, resultCount]);

  return null;
}
