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
  const snapshots = Array.from({ length: 7 }, (_, index) => {
    const daysAgo = 7 - index;
    const progress = index + 1;
    return {
      snapshotDate: isoDate(daysAgo),
      totalProducts: Math.max(0, queues.totalProducts - (8 - progress) * 8),
      publishedProducts: Math.max(0, queues.publishedProducts - (8 - progress)),
      reviewProducts: Math.max(0, queues.reviewProducts + (8 - progress) * 7),
      productsRequiringReview: Math.max(0, queues.productsRequiringReview + (8 - progress) * 4),
      duplicateProducts: Math.max(0, queues.duplicateProducts + (8 - progress) * 3),
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
