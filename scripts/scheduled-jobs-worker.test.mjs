import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runScheduledJobs } from "../ops/cron-worker.mjs";

const ecosystemPath = fileURLToPath(new URL("../ecosystem.config.cjs", import.meta.url));

function loadPm2Apps(secret) {
  const env = { ...process.env };
  if (secret) env.CRON_SECRET = secret;
  else delete env.CRON_SECRET;
  const script = `const apps = require(${JSON.stringify(ecosystemPath)}).apps; process.stdout.write(JSON.stringify(apps.map(({name, env}) => ({name, env}))))`;
  return JSON.parse(execFileSync(process.execPath, ["-e", script], { env, encoding: "utf8" }));
}

test("el scheduler ejecuta ambos procesos protegidos y solo registra totales", async () => {
  const requests = [];
  const messages = [];
  const errors = [];
  const responses = [
    { success: true, orders: { checked: 4, cancelled: ["ORDER-1", "ORDER-2"] }, inventoryReservations: { count: 3, expiredIds: ["RES-1", "RES-2", "RES-3"] } },
    { reports: { processed: 1, succeeded: 1, failed: 0 }, notifications: { processed: 2, delivered: 2, failed: 0 } },
  ];
  const result = await runScheduledJobs({
    baseUrl: "http://127.0.0.1:3000",
    secret: "qa-secret",
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify(responses[requests.length - 1]), { status: 200 });
    },
    logger: { info: (message) => messages.push(message), error: (message) => errors.push(message) },
  });

  assert.deepEqual(requests.map(({ url }) => url).sort(), [
    "http://127.0.0.1:3000/api/cron/gestion",
    "http://127.0.0.1:3000/api/internal/cron/pedidos-expirados",
  ]);
  assert.ok(requests.every(({ init }) => init.method === "POST" && init.headers.authorization === "Bearer qa-secret"));
  assert.deepEqual(result.map(({ job }) => job).sort(), ["expiry", "management"]);
  assert.equal(messages.length, 2);
  assert.equal(errors.length, 0);
  assert.doesNotMatch(messages.join(" "), /ORDER-1|RES-1|qa-secret/);
});

test("el scheduler no llama las rutas cuando falta CRON_SECRET", async () => {
  let called = false;
  await assert.rejects(
    runScheduledJobs({ secret: " ", fetchImpl: async () => { called = true; } }),
    /CRON_SECRET/,
  );
  assert.equal(called, false);
});

test("un cron fallido queda visible y el otro se procesa, sin exponer payload", async () => {
  const errors = [];
  const completed = [];
  await assert.rejects(
    runScheduledJobs({
      secret: "qa-secret",
      fetchImpl: async (url) => String(url).includes("pedidos-expirados")
        ? new Response(JSON.stringify({ error: { message: "QA SECRET / sensitive detail" } }), { status: 503 })
        : new Response(JSON.stringify({ reports: { processed: 0, succeeded: 0, failed: 0 }, notifications: { processed: 0, delivered: 0, failed: 0 } }), { status: 200 }),
      logger: { info: (message) => completed.push(message), error: (message) => errors.push(message) },
    }),
    /expiry/,
  );
  assert.equal(errors.length, 1);
  assert.equal(completed.length, 1);
  assert.match(errors[0], /HTTP 503/);
  assert.doesNotMatch(errors[0], /QA SECRET|sensitive detail|qa-secret/);
});

test("PM2 activa el scheduler integral solo con secreto y pasa intervalo seguro", () => {
  const withoutSecret = loadPm2Apps("");
  assert.deepEqual(withoutSecret.map((app) => app.name), ["coldpower"]);

  const withSecret = loadPm2Apps("qa-secret");
  assert.deepEqual(withSecret.map((app) => app.name), ["coldpower", "coldpower-scheduler"]);
  assert.equal(withSecret[1].env.CRON_SECRET, "qa-secret");
  assert.equal(withSecret[1].env.COLDPOWER_CRON_INTERVAL_MS, "300000");
});
