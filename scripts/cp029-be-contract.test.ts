import assert from "node:assert/strict";
import test from "node:test";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { getAdminCatalogPage } from "@/lib/catalog-admin-service";

type DirectProductTotals = {
  total: number | string;
  unique_sku: number | string;
  published: number | string;
  review: number | string;
  draft: number | string;
  hidden: number | string;
  archived: number | string;
  requires_review: number | string;
  duplicate_pending: number | string;
};

test("CP-029 catálogo mantiene las colas globales alineadas con PostgreSQL", async () => {
  const db = getDb();
  const [directResult, duplicateSkuResult, catalog] = await Promise.all([
    db.execute<DirectProductTotals>(sql`
      select
        count(*)::int as total,
        count(distinct sku)::int as unique_sku,
        count(*) filter (where publication_status = 'published')::int as published,
        count(*) filter (where publication_status = 'review')::int as review,
        count(*) filter (where publication_status = 'draft')::int as draft,
        count(*) filter (where publication_status = 'hidden')::int as hidden,
        count(*) filter (where publication_status = 'archived')::int as archived,
        count(*) filter (where requires_review = true)::int as requires_review,
        count(*) filter (where canonical_product_id is null and possible_duplicate = true and duplicate_decision = 'pending')::int as duplicate_pending
      from products
    `),
    db.execute<{ groups: number | string }>(sql`
      select count(*)::int as groups
      from (
        select sku
        from products
        group by sku
        having count(*) > 1
      ) duplicate_groups
    `),
    getAdminCatalogPage({ page: 1, pageSize: 48 }),
  ]);

  const direct = directResult.rows[0];
  const duplicateSkuGroups = Number(duplicateSkuResult.rows[0]?.groups ?? 0);
  assert.ok(direct);

  assert.deepEqual({
    totalProducts: catalog.queues.totalProducts,
    publishedProducts: catalog.queues.publishedProducts,
    draftProducts: catalog.queues.draftProducts,
    hiddenProducts: catalog.queues.hiddenProducts,
    reviewProducts: catalog.queues.reviewProducts,
    duplicateProducts: catalog.queues.duplicateProducts,
    productsRequiringReview: catalog.queues.productsRequiringReview,
  }, {
    totalProducts: Number(direct.total),
    publishedProducts: Number(direct.published),
    draftProducts: Number(direct.draft),
    hiddenProducts: Number(direct.hidden),
    reviewProducts: Number(direct.review),
    duplicateProducts: Number(direct.duplicate_pending),
    productsRequiringReview: Number(direct.requires_review),
  });
  assert.equal(Number(direct.unique_sku), Number(direct.total));
  assert.equal(duplicateSkuGroups, 0);
  assert.equal(catalog.total, Number(direct.total));
  assert.equal(catalog.totalPages, Math.max(1, Math.ceil(Number(direct.total) / 48)));
});
