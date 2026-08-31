import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { locations } from "@/db/schema";

export async function GET() {
  try {
    const rows = await getDb().select({ id: locations.id, code: locations.code, name: locations.name, type: locations.type, address: locations.address }).from(locations).where(eq(locations.active, true)).orderBy(locations.name);
    return NextResponse.json({ locations: rows });
  } catch { return NextResponse.json({ error: "No se pudieron cargar los locales." }, { status: 503 }); }
}
