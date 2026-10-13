export type ExportFormat = "xlsx" | "csv" | "pdf";

export function exportFormatHref(href: string, format: ExportFormat) {
  const url = new URL(href, "http://localhost");
  url.searchParams.set("format", format);
  return `${url.pathname}${url.search}${url.hash}`;
}
