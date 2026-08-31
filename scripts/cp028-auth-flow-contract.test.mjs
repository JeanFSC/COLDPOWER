import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(file, "utf8");

test("CP-028 usa un landing post-login central y no decide el rol desde el formulario", () => {
  const signIn = read("src/app/sign-in/[[...sign-in]]/page.tsx");
  const signUp = read("src/app/sign-up/[[...sign-up]]/page.tsx");
  const layout = read("src/app/layout.tsx");
  const landing = read("src/app/auth/after-sign-in/page.tsx");
  assert.ok(signIn.includes('fallbackRedirectUrl="/auth/after-sign-in"'));
  assert.ok(signUp.includes('fallbackRedirectUrl="/auth/after-sign-in"'));
  assert.ok(layout.includes('signInFallbackRedirectUrl="/auth/after-sign-in"'));
  assert.ok(layout.includes('signUpFallbackRedirectUrl="/auth/after-sign-in"'));
  assert.ok(landing.includes("users.roleCode"));
  assert.ok(landing.includes("users.status"));
  assert.ok(landing.includes("/admin/dashboard"));
  assert.ok(landing.includes("/admin/operaciones"));
  assert.ok(landing.includes("/cuenta"));
});
