import { NextResponse } from "next/server";
import { quoteConfig } from "@/lib/env";
import { checkQuoteRateLimit, generateQuoteId, validateQuotePayload } from "@/lib/quote";

const maxPayloadBytes = 8 * 1024;
const rateLimitMessage =
  "Recibimos varias solicitudes. Intenta nuevamente en unos minutos o escríbenos por WhatsApp.";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Método no permitido. Usa POST para registrar una solicitud de cotización.",
    },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}

export async function POST(request: Request) {
  const payloadSize = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(payloadSize) && payloadSize > maxPayloadBytes) {
    return NextResponse.json(
      {
        success: false,
        message: "La solicitud es demasiado grande. Reduce el mensaje e intenta nuevamente.",
      },
      { status: 413 },
    );
  }

  const clientIp = getClientIp(request);
  const rateLimit = checkQuoteRateLimit(clientIp);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        message: rateLimitMessage,
        retryAfterMs: rateLimit.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "No se pudo leer la solicitud. Revisa los datos enviados.",
        errors: {
          message: "La solicitud debe enviarse en formato JSON.",
        },
      },
      { status: 400 },
    );
  }

  const validation = validateQuotePayload(body);

  if (!validation.ok) {
    return NextResponse.json(
      {
        success: false,
        message: "Corrige los campos marcados antes de registrar la solicitud.",
        errors: validation.errors,
      },
      { status: 400 },
    );
  }

  const receivedAt = new Date().toISOString();
  const quoteId = generateQuoteId(new Date(receivedAt));

  if (quoteConfig.enableApiLog) {
    console.info("ColdPower quote request registered", {
      quoteId,
      receivedAt,
    });
  }

  // Punto de extensión para conectar adaptadores de correo, CRM o persistencia comercial.
  return NextResponse.json(
    {
      success: true,
      message: "Solicitud registrada. Un asesor confirmará la cotización final.",
      quoteId,
      receivedAt,
    },
    {
      status: 201,
      headers: {
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    },
  );
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwardedFor ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "anonymous"
  );
}
