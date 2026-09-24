import assert from "node:assert/strict";
import test from "node:test";
import { assertOrdersFixtureAllowed } from "./seed-orders-dev";

test("la fixture de pedidos exige confirmación, bypass y una base local", () => {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "development",
    CP_DEV_AUTH_BYPASS: "true",
    CP_DEV_AUTH_USER_ID: "user_fixture",
    DATABASE_URL: "postgres://user:password@127.0.0.1:5432/coldpower",
  };
  assert.doesNotThrow(() => assertOrdersFixtureAllowed(env, ["node", "seed-orders-dev.ts", "--confirm-dev-mock"]));
  assert.throws(() => assertOrdersFixtureAllowed(env, ["node", "seed-orders-dev.ts"]), /confirmar/);
  assert.throws(() => assertOrdersFixtureAllowed({ ...env, DATABASE_URL: "postgres://user:password@ep.example.neon.tech/db" }, ["node", "seed-orders-dev.ts", "--confirm-dev-mock"]), /localhost/);
  assert.throws(() => assertOrdersFixtureAllowed({ ...env, NODE_ENV: "production" }, ["node", "seed-orders-dev.ts", "--confirm-dev-mock"]), /producción/);
});

test("la fixture declara los seis estados pedidos y no usa Neon por defecto", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("./seed-orders-dev.ts", import.meta.url), "utf8"));
  for (const status of ["PAYMENT_PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"]) assert.match(source, new RegExp(status));
  assert.match(source, /localHosts/);
  assert.match(source, /onConflictDoNothing/);
});
