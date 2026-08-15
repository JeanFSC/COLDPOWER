import { NextResponse } from "next/server";
import { catalogEventNames, type CatalogEventName } from "@/lib/analytics";

const allowedEvents = new Set<string>(catalogEventNames);

export async function GET() {
  return NextResponse.json({ success: false, message: "Método no permitido." }, { status: 405, headers: { Allow: "POST" } });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "El evento debe enviarse en JSON." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.name !== "string" || !allowedEvents.has(body.name)) {
    return NextResponse.json({ success: false, message: "Evento no permitido." }, { status: 400 });
  }

  console.info("ColdPower catalog event", {
    name: body.name as CatalogEventName,
    properties: isRecord(body.properties) ? body.properties : {},
  });

  return NextResponse.json({ success: true }, { status: 202 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
