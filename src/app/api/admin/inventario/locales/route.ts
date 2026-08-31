import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLogs, locations } from "@/db/schema";

const types = ["STORE", "WAREHOUSE", "STORE_WAREHOUSE"] as const;
export async function POST(request: Request) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("inventory:adjust"); } catch (error) { if (error instanceof ApiAuthorizationError) return NextResponse.json({ error: "No tienes permiso para gestionar locales." }, { status: 403 }); return NextResponse.json({ error: "No se pudo validar el acceso al inventario." }, { status: 503 }); }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const input = (body && typeof body === "object" ? body : {}) as { code?: unknown; name?: unknown; type?: unknown; address?: unknown };
  const code = typeof input.code === "string" ? input.code.trim().toUpperCase().slice(0, 32) : "";
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) : "";
  if (!code || !name || typeof input.type !== "string" || !(types as readonly string[]).includes(input.type)) return NextResponse.json({ error: "Código, nombre y tipo son obligatorios." }, { status: 400 });
  try {
    const db = getDb();
    const id = `location-${crypto.randomUUID()}`;
    await db.transaction(async (tx) => {
      await tx.insert(locations).values({ id, code, name, type: input.type as (typeof types)[number], address: typeof input.address === "string" ? input.address.trim().slice(0, 240) || null : null });
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "inventory.location_created", entityType: "location", entityId: id, before: null, after: { code, name, type: input.type }, metadata: null });
    });
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) { const message = error instanceof Error ? error.message : "No se pudo crear el local."; return NextResponse.json({ error: message }, { status: message.includes("unique") ? 409 : 500 }); }
}
