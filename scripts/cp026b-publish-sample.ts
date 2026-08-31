import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { brands, categories, families, products, users } from "@/db/schema";
import { getPublishedMediaForEntities } from "@/lib/media-repository";
import { changePublicationStatus } from "@/lib/publication-service";

const selectedSkus = [
  "CP-REF-MCP-0995",
  "CP-REF-VEN-0844",
  "CP-REF-CAP-0412",
  "CP-REF-TAR-0810",
] as const;

async function main() {
  const db = getDb();
  const rows = await db
    .select({
      product: products,
      category: { id: categories.id, name: categories.name, slug: categories.slug },
      family: { id: families.id, name: families.name, slug: families.slug },
      brand: { id: brands.id, name: brands.name, slug: brands.slug },
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(families, eq(products.familyId, families.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(inArray(products.sku, [...selectedSkus]));

  const bySku = new Map(rows.map((row) => [row.product.sku, row]));
  const missing = selectedSkus.filter((sku) => !bySku.has(sku));
  if (missing.length) throw new Error(`Candidatos no encontrados: ${missing.join(", ")}`);

  const actors = await db
    .select({ id: users.id, roleCode: users.roleCode, status: users.status })
    .from(users)
    .where(and(eq(users.roleCode, "SUPERADMIN"), eq(users.status, "ACTIVE")))
    .limit(1);
  if (!actors[0]) throw new Error("No existe un SUPERADMIN activo para ejecutar el flujo editorial.");

  const mediaByProduct = await getPublishedMediaForEntities("product", selectedSkus.map((sku) => bySku.get(sku)!.product.id));
  const published = [];

  for (const sku of selectedSkus) {
    const row = bySku.get(sku)!;
    const product = row.product;
    if (product.publicationStatus === "published") {
      published.push({
        sku,
        id: product.id,
        slug: product.slug,
        category: row.category,
        family: row.family,
        brand: row.brand,
        publicationStatus: product.publicationStatus,
        mediaId: mediaByProduct.get(product.id)?.[0]?.replace("/api/media/", "") ?? null,
        fallbackEditorial: !mediaByProduct.get(product.id)?.length,
        idempotent: true,
      });
      continue;
    }

    if (product.publicationStatus !== "review") throw new Error(`${sku}: estado editorial inesperado ${product.publicationStatus}.`);
    if (!/^(activo|active)$/i.test(product.status ?? "")) throw new Error(`${sku}: origen inactivo.`);
    if (product.requiresReview === true) throw new Error(`${sku}: requiere revisión editorial.`);
    if (product.possibleDuplicate === true && !["different", "keep_both"].includes(product.duplicateDecision ?? "")) throw new Error(`${sku}: posible duplicado pendiente.`);

    const description = `${product.normalizedName}. Referencia de catálogo de la familia ${row.family.name} para ${row.category.name}.`;
    const result = await changePublicationStatus({
      productId: product.id,
      status: "published",
      actorId: actors[0].id,
      actorRole: "SUPERADMIN",
      approveReview: true,
      editorialDescription: description,
      note: "CP-026B: piloto editorial real para QA del catálogo.",
    });

    published.push({
      sku,
      id: product.id,
      slug: product.slug,
      category: row.category,
      family: row.family,
      brand: row.brand,
      publicationStatus: result.status,
      mediaId: mediaByProduct.get(product.id)?.[0]?.replace("/api/media/", "") ?? null,
      fallbackEditorial: !mediaByProduct.get(product.id)?.length,
      idempotent: false,
    });
  }

  console.log(JSON.stringify({
    published,
    note: "Las referencias sin media activa usan el fallback editorial público existente.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
