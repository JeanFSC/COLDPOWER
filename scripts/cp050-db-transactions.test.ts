import assert from "node:assert/strict";
import test from "node:test";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

test("CP-050 la conexión de aplicación soporta transacciones Drizzle reales", async () => {
  const result = await getDb().transaction(async (tx) => {
    await tx.execute(sql`select 1`);
    return true;
  });

  assert.equal(result, true);
});
