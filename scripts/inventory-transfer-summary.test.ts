import assert from "node:assert/strict";
import { test } from "node:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { transfers } from "../src/db/schema";
import { sql } from "drizzle-orm";
import { createDbClient } from "../src/db";
import { transferSummaryFields } from "../src/lib/inventory-transfer-summary";

test("transfer totals correlate with the qualified outer transfer ID", () => {
  const db = drizzle.mock();
  const query = db.select({ id: transfers.id, ...transferSummaryFields() }).from(transfers).toSQL();
  assert.equal((query.sql.match(/ti\.transfer_id = "transfers"\."id"/g) ?? []).length, 2);
  assert.doesNotMatch(query.sql, /ti\.transfer_id = "id"/);
  assert.match(query.sql, /count\(\*\)/);
  assert.match(query.sql, /coalesce\(sum\(ti\.quantity\), 0\)/);
});

test("transfer summaries match independently grouped persisted items", { skip: !process.env.DATABASE_URL }, async () => {
  const client = createDbClient();
  try {
    const rows = await client.db.select({ id: transfers.id, ...transferSummaryFields() }).from(transfers);
    const grouped = await client.db.execute(sql`select transfer_id, count(*) as references, sum(quantity) as units from transfer_items group by transfer_id`);
    const expected = new Map(grouped.rows.map((row) => [String(row.transfer_id), { references: Number(row.references), units: Number(row.units) }]));
    for (const row of rows) {
      const totals = expected.get(row.id) ?? { references: 0, units: 0 };
      assert.equal(Number(row.itemCount), totals.references, row.id);
      assert.equal(Number(row.units), totals.units, row.id);
    }
    console.log(`Compared ${rows.length} persisted transfers without modifying data.`);
  } finally {
    await client.close();
  }
});
