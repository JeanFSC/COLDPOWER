import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runExpirySweep } from "../ops/cron-pedidos-expirados.mjs";

const ecosystemPath = fileURLToPath(new URL("../ecosystem.config.cjs", import.meta.url));

function loadPm2Apps(secret) {
  const env = { ...process.env };
  if (secret) env.CRON_SECRET = secret;
  else delete env.CRON_SECRET;
  const script = `const apps = require(${JSON.stringify(ecosystemPath)}).apps; process.stdout.write(JSON.stringify(apps.map(({name, env}) => ({name, env}))))`;
  return JSON.parse(execFileSync(process.execPath, ["-e", script], { env, encoding: "utf8" }));
}

test("el scheduler invoca la ruta protegida y solo registra totales", async () => {
  let request;
  const messages = [];
  const result = await runExpirySweep({
    baseUrl: "http://127.0.0.1:3000",
    secret: "qa-secret",
    fetchImpl: async (url, init) => {
      request = { url: String(url), init };
      return new Response(JSON.stringify({
        success: true,
        orders: { checked: 4, cancelled: ["ORDER-1", "ORDER-2"] },
        inventoryReservations: { count: 3, expiredIds: ["RES-1", "RES-2", "RES-3"] },
      }), { status: 200 });
    },
    logger: { info: (message) => messages.push(message) },
  });

  assert.equal(request.url, "http://127.0.0.1:3000/api/internal/cron/pedidos-expirados");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers.authorization, "Bearer qa-secret");
  assert.deepEqual(result, { ordersChecked: 4, ordersCancelled: 2, reservationsExpired: 3 });
  assert.equal(messages.length, 1);
  assert.doesNotMatch(messages[0], /ORDER-1|RES-1|qa-secret/);
});

test("el scheduler no llama la ruta cuando falta CRON_SECRET", async () => {
  let called = false;
  await assert.rejects(
    runExpirySweep({ secret: " ", fetchImpl: async () => { called = true; } }),
    /CRON_SECRET/,
  );
  assert.equal(called, false);
});

test("un fallo HTTP del barrido queda visible y no se reporta como éxito", async () => {
  await assert.rejects(
    runExpirySweep({
      secret: "qa-secret",
      fetchImpl: async () => new Response("{}", { status: 503 }),
      logger: { info() { assert.fail("No debe registrar éxito si falla la ruta."); } },
    }),
    /HTTP 503/,
  );
});

test("PM2 solo activa un barrido con secreto y pasa el secreto al proceso", () => {
  const withoutSecret = loadPm2Apps("");
  assert.deepEqual(withoutSecret.map((app) => app.name), ["coldpower"]);

  const withSecret = loadPm2Apps("qa-secret");
  assert.deepEqual(withSecret.map((app) => app.name), ["coldpower", "coldpower-expiry-sweep"]);
  assert.equal(withSecret[1].env.CRON_SECRET, "qa-secret");
  assert.equal(withSecret[1].env.COLDPOWER_EXPIRY_INTERVAL_MS, "300000");
});
