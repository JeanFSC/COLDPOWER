import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("los controles de usuarios anuncian errores de Clerk y permisos", async () => {
  const files = [
    "src/components/admin/UserRoleControl.tsx",
    "src/components/admin/StaffInvitationForm.tsx",
    "src/components/admin/StaffInvitationActions.tsx",
  ];
  for (const file of files) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.match(source, /role="alert"|role=\{messageKind === "error" \? "alert"/);
    assert.match(source, /aria-live="assertive"|aria-live=\{messageKind === "error" \? "assertive"/);
  }
});
