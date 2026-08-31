import assert from "node:assert/strict";
import test from "node:test";
import {
  DEV_MOCK_SEED_VERSION,
  assertDevDatabaseTarget,
  assertDevMockSeedAllowed,
  mockFixtureId,
} from "../src/lib/dev-mock-fixtures";

test("dev mock seed requires explicit confirmation and never runs in production", () => {
  assert.doesNotThrow(() =>
    assertDevMockSeedAllowed({ NODE_ENV: "development" }, ["node", "seed", "--confirm-dev-mock"]),
  );
  assert.throws(() => assertDevMockSeedAllowed({ NODE_ENV: "development" }, ["node", "seed"]));
  assert.throws(() =>
    assertDevMockSeedAllowed({ NODE_ENV: "production" }, ["node", "seed", "--confirm-dev-mock"]),
  );
});

test("mock fixture identifiers are stable and visibly isolated", () => {
  assert.equal(DEV_MOCK_SEED_VERSION, "cp-dashboard-v5");
  assert.equal(mockFixtureId("customer", "001"), "cp-dashboard-v5-customer-001");
  assert.equal(mockFixtureId("customer", "001"), mockFixtureId("customer", "001"));
  assert.notEqual(mockFixtureId("customer", "001"), mockFixtureId("customer", "002"));
});

test("development database guard requires the local development marker", () => {
  assert.doesNotThrow(() =>
    assertDevDatabaseTarget({ NODE_ENV: "development", CP_DEV_AUTH_BYPASS: "true" }, ["--confirm-dev-mock"]),
  );
  assert.throws(() =>
    assertDevDatabaseTarget({ NODE_ENV: "development", CP_DEV_AUTH_BYPASS: "false" }, ["--confirm-dev-mock"]),
  );
  assert.throws(() =>
    assertDevDatabaseTarget({ NODE_ENV: "production", CP_DEV_AUTH_BYPASS: "true" }, ["--confirm-dev-mock"]),
  );
  assert.throws(() =>
    assertDevDatabaseTarget({ NODE_ENV: "development", CP_DEV_AUTH_BYPASS: "true" }, ["--replace-legacy-mock"]),
  );
});
