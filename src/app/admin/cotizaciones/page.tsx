import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { getQuotesPage } from "@/lib/quote-repository";
import { parseQuoteFilters } from "@/lib/quote-contract";
import { QuoteStatusControl } from "@/components/admin/QuoteStatusControl";
import { QuoteConversionControl } from "@/components/admin/QuoteConversionControl";
import { QuotesWorkspace } from "@/components/admin/AdminCategoryViews";

export const metadata: Metadata = {
  title: "Cotizaciones | Panel admin ColdPower",
  description: "Bandeja operativa de solicitudes de cotización de ColdPower.",
};

export default async function AdminCotizacionesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("quotes.view");
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  const quotePage = await getQuotesPage(parseQuoteFilters(query));
  const rows = quotePage.items.map((quote) => ({
    id: quote.id,
    customer: quote.name,
    products: quote.productName || "Consulta general",
    total: `${quote.itemCount} ítems`,
    status: quote.status,
    method: quote.preferredContact,
    date: quote.createdAt.toLocaleDateString("es-PE"),
  }));
  return (
    <QuotesWorkspace
      rows={rows}
      controls={
        <div className="grid gap-3">
          {quotePage.items.map((quote) => (
              <div
                key={quote.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e3ebf2] p-3"
              >
                <div>
                  <p className="font-mono text-[10px] font-extrabold text-[#304b66]">{quote.trackingCode}</p>
                  <p className="mt-1 text-[10px] text-[#8296a9]">
                    {quote.name} · {quote.productName || "Consulta general"}
                  </p>
                  <p className="mt-1 text-[10px] text-[#8296a9]">
                    {quote.customerType} · {quote.documentNumber || "Sin documento"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <QuoteStatusControl quoteId={quote.id} status={quote.status} />
                  <QuoteConversionControl quoteId={quote.id} status={quote.status} />
                </div>
              </div>
            ))}
        </div>
      }
      metrics={quotePage.metrics}
      pagination={{ page: quotePage.page, totalPages: quotePage.totalPages, totalItems: quotePage.totalItems }}
      facets={quotePage.facets}
      query={query.get("query") ?? undefined}
      queryString={query.toString()}
      exportHref={`/api/admin/cotizaciones/export?${query.toString()}`}
    />
  );
}
