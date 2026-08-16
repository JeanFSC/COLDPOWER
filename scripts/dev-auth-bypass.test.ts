import assert from "node:assert/strict";
import test from "node:test";
import { assertDevAuthBypassSafe, resolveDevAuthBypassUserId } from "@/lib/dev-auth-bypass";

const base = {
  requestHost: "localhost:3000",
  nodeEnv: "development",
  deploymentEnv: undefined,
  enabled: "true",
  userId: "user_dev_superadmin",
  allowedHosts: "localhost:3000",
};

test("dev auth bypass resolves only the configured local actor", () => {
  assert.equal(resolveDevAuthBypassUserId(base), "user_dev_superadmin");
});

test("dev auth bypass rejects disabled, incomplete, foreign-host and production contexts", () => {
  assert.equal(resolveDevAuthBypassUserId({ ...base, enabled: "false" }), null);
  assert.equal(resolveDevAuthBypassUserId({ ...base, userId: "" }), null);
  assert.equal(resolveDevAuthBypassUserId({ ...base, requestHost: "dev.coldpower.pe" }), null);
  assert.throws(() => resolveDevAuthBypassUserId({ ...base, nodeEnv: "production" }), /CP_DEV_AUTH_BYPASS no puede activarse en producción/);
  assert.throws(() => resolveDevAuthBypassUserId({ ...base, deploymentEnv: "production" }), /CP_DEV_AUTH_BYPASS no puede activarse en producción/);
});

test("production fails closed if the temporary bypass flag is accidentally present", () => {
  assert.throws(
    () => assertDevAuthBypassSafe({ nodeEnv: "production", deploymentEnv: undefined, enabled: "true" }),
    /CP_DEV_AUTH_BYPASS no puede activarse en producción/,
  );
  assert.doesNotThrow(() => assertDevAuthBypassSafe({ nodeEnv: "development", deploymentEnv: undefined, enabled: "true" }));
});
