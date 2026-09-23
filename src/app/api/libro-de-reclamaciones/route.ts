import { NextResponse } from "next/server";
import { quoteConfig } from "@/lib/env";
import { checkPublicRateLimit } from "@/lib/public-rate-limit";
import { createPublicComplaint } from "@/lib/public-complaint-service";
import { validatePublicComplaintPayload } from "@/lib/public-complaint-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const clientIp = request.headers.get("cf-connecting-ip")?.trim() || request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const rateLimit = checkPublicRateLimit(`complaint:${clientIp}`, quoteConfig.quoteRateLimit);
  const headers = { "X-RateLimit-Limit": String(quoteConfig.quoteRateLimit.max), "X-RateLimit-Remaining": String(rateLimit.remaining) };
  if (!rateLimit.allowed) return NextResponse.json({ success: false, message: "Recibimos varias solicitudes. Intenta nuevamente en unos minutos." }, { status: 429, headers: { ...headers, "Retry-After": String(rateLimit.retryAfterSeconds) } });

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: "No se pudo leer la solicitud." }, { status: 400, headers });
  }
  const validation = validatePublicComplaintPayload(payload);
  if (!validation.ok) return NextResponse.json({ success: false, message: "Revisa los datos marcados antes de enviar el reclamo.", errors: validation.errors }, { status: 400, headers });

  try {
    const result = await createPublicComplaint(validation.data);
    return NextResponse.json({ success: true, ticketNumber: result.ticketNumber, message: `Tu solicitud fue registrada con el código ${result.ticketNumber}.` }, { status: result.idempotent ? 200 : 201, headers });
  } catch (error) {
    console.error("ColdPower: no se pudo persistir el reclamo público", error);
    return NextResponse.json({ success: false, message: "No pudimos registrar tu solicitud. Intenta nuevamente." }, { status: 503, headers });
  }
}
