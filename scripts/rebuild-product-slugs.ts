import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inArray, sql } from "drizzle-orm";
import { createDbClient } from "../src/db";
import { products, quotes } from "../src/db/schema";
import { planProductSlugs } from "./inventory-import.mjs";

export type StoredProductSlug = {
  id: string;
  sku: string;
  normalizedName: string;
  slug: string;
};

export type SlugRebuildChange = {
  id: string;
  sku: string;
  oldSlug: string;
  newSlug: string;
};

export type SlugRebuildPlan = {
  totalProducts: number;
  unchanged: number;
  changes: SlugRebuildChange[];
};

type SlugRebuildReport = SlugRebuildPlan & {
  quoteReferencesUpdated: number;
  errors: string[];
};

export function planSlugRebuild(rows: StoredProductSlug[]): SlugRebuildPlan {
  const plannedSlugs = planProductSlugs(
    rows.map((row) => ({ sku: row.sku, nombre_normalizado: row.normalizedName })),
  );
  const changes = rows
    .map((row) => ({
      id: row.id,
      sku: row.sku,
      oldSlug: row.slug,
      newSlug: plannedSlugs.get(row.sku),
    }))
    .filter((row): row is SlugRebuildChange => Boolean(row.newSlug) && row.oldSlug !== row.newSlug)
    .sort((left, right) => (left.id === right.id ? 0 : left.id < right.id ? -1 : 1));

  return {
    totalProducts: rows.length,
    unchanged: rows.length - changes.length,
    changes,
  };
}

export function parseRebuildOptions(args: string[]) {
  return { apply: args.includes("--apply") };
}

async function rebuildProductSlugs(apply: boolean): Promise<SlugRebuildReport> {
  const report: SlugRebuildReport = {
    totalProducts: 0,
    unchanged: 0,
    changes: [],
    quoteReferencesUpdated: 0,
    errors: [],
  };
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    report.errors.push("DATABASE_URL no está configurado; no se puede reconstruir los slugs.");
    return report;
  }

  const client = createDbClient({ databaseUrl });
  const db = client.db;

  try {
    await db.transaction(async (tx) => {
      const currentRows = await tx
        .select({
          id: products.id,
          sku: products.sku,
          normalizedName: products.normalizedName,
          slug: products.slug,
        })
        .from(products);
      const plan = planSlugRebuild(currentRows);
      report.totalProducts = plan.totalProducts;
      report.unchanged = plan.unchanged;
      report.changes = plan.changes;

      if (!apply || plan.changes.length === 0) return;

      const productIds = plan.changes.map((change) => change.id);
      const now = new Date();
      await tx
        .update(products)
        .set({
          slug: sql<string>`'__coldpower_slug_rebuild__' || ${products.id}`,
          updatedAt: now,
        })
        .where(inArray(products.id, productIds));
      await tx
        .update(products)
        .set({
          slug: productSlugCase(plan.changes),
          updatedAt: now,
        })
        .where(inArray(products.id, productIds));

      const oldSlugs = plan.changes.map((change) => change.oldSlug);
      const quoteRows = await tx
        .select({ id: quotes.id, productSlug: quotes.productSlug })
        .from(quotes)
        .where(inArray(quotes.productSlug, oldSlugs));
      if (quoteRows.length > 0) {
        const replacementByOldSlug = new Map(plan.changes.map((change) => [change.oldSlug, change.newSlug]));
        const quoteChanges = quoteRows.flatMap((quote) => {
          const newSlug = quote.productSlug ? replacementByOldSlug.get(quote.productSlug) : undefined;
          return newSlug ? [{ id: quote.id, newSlug }] : [];
        });
        if (quoteChanges.length > 0) {
          await tx
            .update(quotes)
            .set({ productSlug: quoteSlugCase(quoteChanges), updatedAt: now })
            .where(inArray(quotes.id, quoteChanges.map((quote) => quote.id)));
          report.quoteReferencesUpdated = quoteChanges.length;
        }
      }
    });
  } finally {
    await client.close();
  }

  return report;
}

function productSlugCase(changes: SlugRebuildChange[]) {
  const cases = sql.join(changes.map((change) => sql`when ${change.id} then ${change.newSlug}`), sql` `);
  return sql<string>`case ${products.id} ${cases} else ${products.slug} end`;
}

function quoteSlugCase(changes: Array<{ id: string; newSlug: string }>) {
  const cases = sql.join(changes.map((change) => sql`when ${change.id} then ${change.newSlug}`), sql` `);
  return sql<string>`case ${quotes.id} ${cases} else ${quotes.productSlug} end`;
}

async function main() {
  const options = parseRebuildOptions(process.argv.slice(2));
  const report = await rebuildProductSlugs(options.apply);
  const reportPath = path.resolve(process.cwd(), "tmp/product-slug-rebuild-latest.json");
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));

  if (report.errors.length > 0) process.exitCode = 1;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
