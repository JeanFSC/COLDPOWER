import { NextResponse } from "next/server";
import { companySettings } from "@/db/schema";
import { getDb } from "@/db";
import { company } from "@/data/company";
import { createWhatsAppLink } from "@/lib/whatsapp";
import { createWhatsAppLead } from "@/lib/whatsapp-lead-service";
import { whatsappRateLimitConfig } from "@/lib/env";
import { checkPublicRateLimit } from "@/lib/public-rate-limit";

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  const rate = checkPublicRateLimit(`whatsapp:${clientKey}`, whatsappRateLimitConfig);
  if (!rate.allowed) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta nuevamente más tarde." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  try {
    const [settings] = await getDb().select({ whatsapp: companySettings.whatsapp }).from(companySettings).limit(1);
    const phone = settings?.whatsapp?.trim() || company.whatsapp.trim();
    if (!phone) return NextResponse.json({ error: "WhatsApp no está configurado; usa el formulario web." }, { status: 409 });
    const lead = await createWhatsAppLead({ name: value.name as string, phone: value.phone as string, email: typeof value.email === "string" ? value.email : null, title: typeof value.title === "string" ? value.title : null, productIds: Array.isArray(value.productIds) ? value.productIds.filter((item): item is string => typeof item === "string") : [], quantities: value.quantities && typeof value.quantities === "object" ? value.quantities as Record<string, number> : {} });
    const items = Array.isArray(value.items) ? value.items : [];
    const itemText = items.slice(0, 20).map((item) => typeof item === "object" && item ? `${String((item as Record<string, unknown>).name ?? "Producto")} · SKU ${String((item as Record<string, unknown>).sku ?? "sin SKU")} · cantidad ${String((item as Record<string, unknown>).quantity ?? 1)}` : "").filter(Boolean).join("\n");
    const message = [`Hola ColdPower, deseo continuar con la oportunidad ${lead.opportunity.code}.`, itemText].filter(Boolean).join("\n");
    return NextResponse.json({ success: true, opportunityCode: lead.opportunity.code, url: createWhatsAppLink({ phone, message }) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo registrar el lead." }, { status: 400 }); }
}


