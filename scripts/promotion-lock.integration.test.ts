import assert from "node:assert/strict";
import test from "node:test";
import { sql } from "drizzle-orm";
import { createDbClient } from "../src/db";
import { assertPromotionConflict } from "../src/lib/promotion-service";
import { lockPromotionMutation } from "../src/lib/promotion-mutation-lock";
import { validatePromotionInput } from "../src/lib/operations-validation";
const input = validatePromotionInput({ name: "QA lock", type: "AMOUNT", discountValue: 1, startsAt: "2091-01-01T00:00:00Z", endsAt: "2091-02-01T00:00:00Z", status: "ACTIVE", policy: "EXCLUSIVE", priority: 0 });

test("QA: bloqueo de activación de promociones excluye otra transacción y se libera al finalizar", { skip: process.env.QA_PROMOTION_CONFLICT !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const first = createDbClient();
  const second = createDbClient();
  let ready!: () => void;
  let release!: () => void;
  const acquired = new Promise<void>(resolve => { ready = resolve; });
  const released = new Promise<void>(resolve => { release = resolve; });
  const holder = first.db.transaction(async tx => {
    await lockPromotionMutation(tx);
    ready();
    await released;
  });
  try {
    await Promise.race([acquired, holder.then(() => { throw new Error("Unexpected lock exit"); })]);
    await second.db.transaction(async tx => {
      const result = await tx.execute(sql`select pg_try_advisory_xact_lock(hashtext('coldpower:promotion-activation')) as acquired`);
      assert.equal(result.rows[0].acquired, false);
    });
    release();
    await holder;
    await second.db.transaction(async tx => {
      await assertPromotionConflict(tx, input);
      const result = await tx.execute(sql`select pg_try_advisory_xact_lock(hashtext('coldpower:promotion-activation')) as acquired`);
      assert.equal(result.rows[0].acquired, true);
    });
  } finally {
    release();
    await holder.catch(() => undefined);
    await Promise.all([first.close(), second.close()]);
  }
});
