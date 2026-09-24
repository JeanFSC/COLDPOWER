import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("las rutas de autenticación muestran estados reales de Clerk", async () => {
  const signIn = await read("src/app/sign-in/[[...sign-in]]/page.tsx");
  const signUp = await read("src/app/sign-up/[[...sign-up]]/page.tsx");
  const panel = await read("src/components/auth/ClerkAuthPanel.tsx");
  const appearance = await read("src/components/auth/clerkAppearance.ts");
  const styles = await read("src/app/globals.css");
  const proxy = await read("src/proxy.ts");
  const header = await read("src/components/layout/Header.tsx");
  const mobileMenu = await read("src/components/layout/MobileMenu.tsx");

  assert.match(signIn, /ClerkAuthPanel/);
  assert.match(signUp, /ClerkAuthPanel/);
  assert.match(panel, /ClerkLoading/);
  assert.match(panel, /ClerkLoaded/);
  assert.match(panel, /ClerkFailed/);
  assert.match(panel, /auth-timeout-state/);
  assert.match(styles, /auth-timeout-state/);
  assert.match(styles, /8s/);
  assert.match(panel, /La autenticación está tardando más de lo esperado/);
  assert.match(panel, /routing="path"/);
  assert.match(signIn, /fallbackRedirectUrl="\/auth\/after-sign-in"/);
  assert.match(signUp, /fallbackRedirectUrl="\/auth\/after-sign-in"/);
  assert.match(panel, /aria-live="polite"/);
  assert.match(panel, /Reintentar/);
  assert.match(appearance, /rootBox: "!w-full !max-w-full/);
  assert.match(appearance, /cardBox: "!w-full !max-w-full/);
  assert.match(appearance, /!bg-transparent !shadow-none/);
  assert.match(appearance, /socialButtonsPlacement: "bottom"/);
  assert.match(proxy, /signInUrl: authConfig\.signInUrl/);
  assert.match(proxy, /signUpUrl: authConfig\.signUpUrl/);
  assert.match(header, /ClerkLoading/);
  assert.match(header, /ClerkFailed/);
  assert.match(header, /ClerkLoaded/);
  assert.match(header, /Show when="signed-in"/);
  assert.match(header, /Show when="signed-out"/);
  // Header keeps a useful signed-out account action while Clerk loads or
  // fails. The previous copy assertion no longer described the live fallback.
  assert.match(header, /ClerkLoading><SignedOutAccountAction/);
  assert.match(mobileMenu, /ClerkLoading/);
  assert.match(mobileMenu, /ClerkLoaded/);
});
