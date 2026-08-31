export const catalogEventNames = [
  "search_submitted",
  "search_zero_results",
  "search_result_clicked",
  "filter_applied",
  "product_viewed",
  "compatibility_checked",
  "compare_added",
  "quote_item_added",
  "quote_started",
  "quote_submitted",
  "whatsapp_clicked",
  "document_downloaded",
  "product_not_found_sent",
] as const;

export type CatalogEventName = (typeof catalogEventNames)[number];
export type CatalogEventProperties = Record<string, string | number | boolean | undefined>;

export function trackCatalogEvent(name: CatalogEventName, properties: CatalogEventProperties = {}) {
  if (typeof window === "undefined") return;

  const event = {
    name,
    properties,
    occurredAt: new Date().toISOString(),
  };
  const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer;
  dataLayer?.push({ event: name, ...properties });
  window.dispatchEvent(new CustomEvent("coldpower:analytics", { detail: event }));

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/eventos", JSON.stringify(event));
  }
}
