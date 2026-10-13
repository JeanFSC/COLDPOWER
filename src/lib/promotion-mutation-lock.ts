import { sql } from "drizzle-orm";
import type { getDb } from "@/db";

type PromotionTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
export async function lockPromotionMutation(tx: PromotionTransaction) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('coldpower:promotion-activation'))`);
}
