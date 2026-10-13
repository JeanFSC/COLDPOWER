import assert from "node:assert/strict";
import test from "node:test";
import { sql } from "drizzle-orm";
import { createDbClient } from "../src/db";
import { lockTaxonomyMutation } from "../src/lib/taxonomy-mutation-lock";

test("QA: bloqueo de taxonomía excluye otra transacción y se libera al finalizar", { skip: process.env.QA_TAXONOMY_LOCK !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const first = createDbClient();
  const second = createDbClient();
  let ready!: () => void;
  let release!: () => void;
  const acquired = new Promise<void>(resolve => { ready = resolve; });
  const released = new Promise<void>(resolve => { release = resolve; });
  const holder = first.db.transaction(async tx => {
    await lockTaxonomyMutation(tx);
    ready();
    await released;
  });
  try {
    await Promise.race([acquired, holder.then(() => { throw new Error("Unexpected lock exit"); })]);
    await second.db.transaction(async tx => {
      const result = await tx.execute(sql`select pg_try_advisory_xact_lock(hashtext('coldpower:taxonomy-mutations')) as acquired`);
      assert.equal(result.rows[0].acquired, false);
    });
    release();
    await holder;
    await second.db.transaction(async tx => {
      await lockTaxonomyMutation(tx);
      const result = await tx.execute(sql`select pg_try_advisory_xact_lock(hashtext('coldpower:taxonomy-mutations')) as acquired`);
      assert.equal(result.rows[0].acquired, true);
    });
  } finally {
    release();
    await holder.catch(() => undefined);
    await Promise.all([first.close(), second.close()]);
  }
});
