import { sql } from "drizzle-orm";
import { transfers } from "@/db/schema";

export function transferSummaryFields() {
  // Keep the outer ID qualified when Drizzle renders a single-table selection.
  // Otherwise PostgreSQL resolves bare "id" to the transfer_items row.
  const transferId = sql`${transfers.id}`;
  return {
    itemCount: sql<string>`(select count(*) from transfer_items ti where ti.transfer_id = ${transferId})`,
    units: sql<string>`(select coalesce(sum(ti.quantity), 0) from transfer_items ti where ti.transfer_id = ${transferId})`,
  };
}
