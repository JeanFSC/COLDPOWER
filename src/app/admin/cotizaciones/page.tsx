import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { permissionsForRole } from "@/lib/roles";
import { getQuotesPage } from "@/lib/quote-repository";
import { parseQuoteFilters } from "@/lib/quote-contract";
import { QuotesWorkspace } from "@/components/admin/QuotesWorkspace";

export const metadata: Metadata = {
  title: "Cotizaciones | Panel admin ColdPower",
  description: "Workspace operativo de propuestas comerciales de ColdPower.",
};

export default async function AdminCotizacionesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePermission("quotes.view");
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  const quotePage = await getQuotesPage(parseQuoteFilters(query));
  return (
    <QuotesWorkspace
      page={quotePage}
      permissions={permissionsForRole(actor.role)}
      queryString={query.toString()}
      exportHref={`/api/admin/cotizaciones/export?${query.toString()}`}
      opportunityId={query.get("opportunityId") ?? undefined}
      customerId={query.get("customerId") ?? undefined}
    />
  );
}

// Customer fields remain part of the server contract: customerType, documentNumber and department are never dropped from quote detail/export.
