import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { quoteConfig } from "@/lib/env";
import { checkPublicRateLimit } from "@/lib/public-rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const clientIp = request.headers.get("cf-connecting-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const rateLimit = checkPublicRateLimit(`newsletter:${clientIp}`, quoteConfig.quoteRateLimit);
  if (!rateLimit.allowed) return NextResponse.json({ success: false, message: "Intenta nuevamente en unos minutos." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: "Solicitud inválida." }, { status: 400 }); }
  const email = typeof body === "object" && body !== null && "email" in body && typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) return NextResponse.json({ success: false, message: "Ingresa un correo válido." }, { status: 400 });

  try {
    await getDb().insert(newsletterSubscribers).values({ id: `newsletter-${crypto.randomUUID()}`, email }).onConflictDoUpdate({ target: newsletterSubscribers.email, set: { status: "SUBSCRIBED", updatedAt: new Date(), consentAt: new Date() } });
    return NextResponse.json({ success: true, message: "Correo registrado." }, { status: 201 });
  } catch (error) {
    console.error("ColdPower: no se pudo persistir la suscripción al newsletter", error);
    return NextResponse.json({ success: false, message: "No pudimos registrar el correo en este momento." }, { status: 503 });
  }
}
