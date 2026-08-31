import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ApiAuthorizationError, requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { normalizePhone, sanitizeText } from "@/lib/quote";

export async function GET() {
  let userId: string;
  try { ({ userId } = await requireApiUser()); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("AUTH_REQUIRED", "Debes iniciar sesión para consultar tu perfil.", 401); throw error; }

  try {
    const db = getDb();
    const rows = await db.select({ email: users.email, name: users.name, phone: users.phone }).from(users).where(eq(users.id, userId)).limit(1);
    return NextResponse.json({ success: true, profile: rows[0] ?? null });
  } catch (error) {
    console.error("ColdPower: no se pudo cargar el perfil", error);
    return NextResponse.json({ success: false, message: "No se pudo cargar el perfil." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  let userId: string;
  try { ({ userId } = await requireApiUser()); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("AUTH_REQUIRED", "Debes iniciar sesión para actualizar tu perfil.", 401); throw error; }
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "JSON invalido." }, { status: 400 });
  }

  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const name = sanitizeText(input.name, 80);
  const phone = normalizePhone(input.phone, 24);
  if (!name) return NextResponse.json({ success: false, message: "El nombre es obligatorio." }, { status: 400 });

  try {
    const db = getDb();
    await db.update(users).set({ name, phone: phone || null, updatedAt: new Date() }).where(eq(users.id, userId));
    return NextResponse.json({ success: true, profile: { name, phone: phone || null } });
  } catch (error) {
    console.error("ColdPower: no se pudo actualizar el perfil", error);
    return NextResponse.json({ success: false, message: "No se pudo actualizar el perfil." }, { status: 503 });
  }
}
