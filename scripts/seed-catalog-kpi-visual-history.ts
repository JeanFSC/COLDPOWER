import { getAdminCatalogPage } from "../src/lib/catalog-admin-service";
import { getDb } from "../src/db";
import { catalogMetricSnapshots } from "../src/db/schema";
import { assertDevDatabaseTarget, assertDevMockSeedAllowed } from "../src/lib/dev-mock-fixtures";

function isoDate(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export async function seedCatalogKpiVisualHistory() {
  assertDevMockSeedAllowed(process.env, process.argv);
  assertDevDatabaseTarget(process.env, process.argv);
  const catalog = await getAdminCatalogPage({ page: 1, pageSize: 1 });
  const { queues } = catalog;
  const db = getDb();
  // Development-only visual fixture. The offsets preserve the catalog's real current
  // KPI values while creating the same irregular cadence used by the dashboard cards;
  // they are deliberately not operational history.
  const totalOffsets = [-17, -15, -12, -13, -8, -3, -1];
  const publishedOffsets = [-1, -1, -2, -1, -1, 0, 0];
  const requiresReviewOffsets = [15, 12, 14, 9, 11, 4, 1];
  const duplicateOffsets = [10, 8, 11, 7, 8, 4, 1];
  const snapshots = Array.from({ length: 7 }, (_, index) => {
    const daysAgo = 7 - index;
    const totalProducts = Math.max(0, queues.totalProducts + totalOffsets[index]);
    const publishedProducts = Math.min(
      totalProducts,
      Math.max(0, queues.publishedProducts + publishedOffsets[index]),
    );
    return {
      snapshotDate: isoDate(daysAgo),
      totalProducts,
      publishedProducts,
      reviewProducts: Math.max(0, totalProducts - publishedProducts),
      productsRequiringReview: Math.max(
        0,
        queues.productsRequiringReview + requiresReviewOffsets[index],
      ),
      duplicateProducts: Math.max(0, queues.duplicateProducts + duplicateOffsets[index]),
    };
  });
  for (const snapshot of snapshots) {
    await db.insert(catalogMetricSnapshots).values(snapshot).onConflictDoUpdate({
      target: catalogMetricSnapshots.snapshotDate,
      set: snapshot,
    });
  }
  return snapshots.length;
}

seedCatalogKpiVisualHistory()
  .then((count) => console.log(`Fixture visual de ${count} cortes KPI aplicada.`))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
