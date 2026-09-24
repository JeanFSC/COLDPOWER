import assert from "node:assert/strict";
import test from "node:test";
import { getDatabaseDriver } from "../src/db";
import { assertLocalDatabaseUrl } from "./restore-local-from-backup";

test("la restauración acepta únicamente destinos locales", () => {
  assert.equal(assertLocalDatabaseUrl("postgres://coldpower:local@127.0.0.1:5432/coldpower"), "postgres://coldpower:local@127.0.0.1:5432/coldpower");
  assert.doesNotThrow(() => assertLocalDatabaseUrl("postgres://coldpower:local@localhost:5432/coldpower"));
  assert.doesNotThrow(() => assertLocalDatabaseUrl("postgres://coldpower:local@[::1]:5432/coldpower"));
  assert.throws(() => assertLocalDatabaseUrl("postgres://user:password@ep-example.neon.tech/db"), /no a localhost/);
});

test("el driver conserva Neon por defecto y permite PostgreSQL local explícito", () => {
  assert.equal(getDatabaseDriver(undefined), "neon");
  assert.equal(getDatabaseDriver("neon"), "neon");
  assert.equal(getDatabaseDriver("pg"), "pg");
  assert.throws(() => getDatabaseDriver("mysql"), /no soportado/);
});
