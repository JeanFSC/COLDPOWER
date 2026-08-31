import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { mediaAssets } from "@/db/schema";
import { readMediaFile } from "@/lib/media-storage";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const [asset] = await getDb().select({ storageKey: mediaAssets.storageKey, mimeType: mediaAssets.mimeType }).from(mediaAssets).where(and(eq(mediaAssets.id, id), eq(mediaAssets.status, "ACTIVE"), isNull(mediaAssets.deletedAt))).limit(1); if (!asset) return NextResponse.json({ error: "Media no encontrada." }, { status: 404 }); try { const content = await readMediaFile(asset.storageKey); return new Response(content, { status: 200, headers: { "Content-Type": asset.mimeType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } }); } catch { return NextResponse.json({ error: "Archivo multimedia no disponible." }, { status: 404 }); } }
