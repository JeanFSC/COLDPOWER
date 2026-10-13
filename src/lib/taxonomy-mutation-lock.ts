import { sql } from "drizzle-orm";
import type { getDb } from "@/db";

type TaxonomyTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/** Serialize admin taxonomy writes so identity and parent checks share one snapshot. */
export async function lockTaxonomyMutation(tx: TaxonomyTransaction) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('coldpower:taxonomy-mutations'))`);
}
