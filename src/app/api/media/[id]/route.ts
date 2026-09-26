import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { categories, families, mediaAssetUsages, mediaAssets, products } from "@/db/schema";
import { readMediaFile } from "@/lib/media-storage";
import { resolveProductImage } from "@/lib/product-image";

export const runtime = "nodejs";

async function readReferenceImage(assetId: string) {
  const db = getDb();
  const [productContext] = await db
    .select({
      family: families.name,
      familySlug: families.slug,
      category: categories.name,
      categorySlug: categories.slug,
    })
    .from(mediaAssetUsages)
    .innerJoin(products, and(eq(mediaAssetUsages.entityType, "product"), eq(mediaAssetUsages.entityId, products.id)))
    .innerJoin(families, eq(products.familyId, families.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(mediaAssetUsages.assetId, assetId))
    .orderBy(asc(mediaAssetUsages.sortOrder), asc(mediaAssetUsages.createdAt))
    .limit(1);

  const fallback = resolveProductImage(productContext ?? {}).src;
  const relativePath = fallback.replace(/^\//, "");
  const content = await readFile(path.join(process.cwd(), "public", relativePath));
  return { content, fallback };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [asset] = await getDb()
    .select({ storageKey: mediaAssets.storageKey, mimeType: mediaAssets.mimeType })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, id), eq(mediaAssets.status, "ACTIVE"), isNull(mediaAssets.deletedAt)))
    .limit(1);

  if (!asset) return NextResponse.json({ error: "Media no encontrada." }, { status: 404 });

  try {
    const content = await readMediaFile(asset.storageKey);
    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    try {
      const reference = await readReferenceImage(id);
      console.warn("ColdPower: asset multimedia sin archivo físico; se entrega placeholder referencial", {
        assetId: id,
        storageKey: asset.storageKey,
        fallback: reference.fallback,
        error: error instanceof Error ? error.message : String(error),
      });
      return new Response(reference.content, {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=3600",
          "X-Content-Type-Options": "nosniff",
          "X-ColdPower-Media-Fallback": "reference",
        },
      });
    } catch (fallbackError) {
      console.warn("ColdPower: no se pudo resolver placeholder de media", {
        assetId: id,
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
      return NextResponse.json({ error: "Archivo multimedia no disponible." }, { status: 404 });
    }
  }
}
