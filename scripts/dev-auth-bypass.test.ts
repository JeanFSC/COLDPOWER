import assert from "node:assert/strict";
import test from "node:test";
import { getDevAuthUserId, type DevAuthEnvironment } from "../src/lib/dev-auth-bypass";

const enabledDev: DevAuthEnvironment = {
  NODE_ENV: "development",
  CP_DEV_AUTH_BYPASS: "true",
  CP_DEV_AUTH_USER_ID: "user_existing_superadmin",
  CP_DEV_AUTH_ALLOWED_HOSTS: "localhost:3000,127.0.0.1:3000",
};

test("dev bypass resolves the configured existing user on an allowed host", () => {
  assert.equal(getDevAuthUserId("localhost:3000", enabledDev), "user_existing_superadmin");
  assert.equal(getDevAuthUserId("127.0.0.1:3000", enabledDev), "user_existing_superadmin");
});

test("dev bypass rejects production even when the flag is enabled", () => {
  assert.equal(
    getDevAuthUserId("localhost:3000", { ...enabledDev, NODE_ENV: "production" }),
    null,
  );
  assert.equal(
    getDevAuthUserId("localhost:3000", { ...enabledDev, VERCEL_ENV: "production" }),
    null,
  );
});

test("dev bypass rejects hosts outside the explicit allowlist", () => {
  assert.equal(getDevAuthUserId("dev.coldpower.pe", enabledDev), null);
  assert.equal(getDevAuthUserId("192.168.1.50:3000", enabledDev), null);
});

test("dev bypass fails closed when configuration is incomplete or disabled", () => {
  assert.equal(getDevAuthUserId("localhost:3000", { ...enabledDev, CP_DEV_AUTH_BYPASS: "false" }), null);
  assert.equal(getDevAuthUserId("localhost:3000", { ...enabledDev, CP_DEV_AUTH_USER_ID: "" }), null);
  assert.equal(getDevAuthUserId("localhost:3000", { ...enabledDev, CP_DEV_AUTH_ALLOWED_HOSTS: "" }), null);
});
