import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("brief 19 conserva borradores legales en el repositorio", () => {
  const documents = [
    "docs/legal/terminos-y-condiciones.md",
    "docs/legal/politica-de-privacidad.md",
    "docs/legal/cambios-y-devoluciones.md",
  ];
  for (const file of documents) {
    const source = read(file);
    assert.match(source, /^# /m, file);
    assert.match(source, /Documento en revisi.n legal/i, file);
    assert.match(source, /\[DEFINIR\]/, file);
  }
});

test("las rutas legales estÃ¡n protegidas por la publicaciÃ³n persistida", () => {
  for (const file of ["src/app/terminos/page.tsx", "src/app/privacidad/page.tsx", "src/app/cambios-y-devoluciones/page.tsx"]) {
    const source = read(file);
    assert.match(source, /getPublicCompanySettings/);
    assert.match(source, /legalPagesPublished/);
    assert.match(source, /notFound\(\)/);
  }
  assert.match(read("src/app/sitemap.ts"), /legalPagesPublished \? /);
  assert.match(read("src/components/layout/Footer.tsx"), /settings\.legalPagesPublished/);
  assert.match(read("src/components/layout/Footer.tsx"), /T.rminos y condiciones/);
  assert.match(read("src/components/layout/Footer.tsx"), /Pol.tica de privacidad/);
});

test("solo SUPERADMIN recibe y puede cambiar el control de publicaciÃ³n legal", () => {
  const roles = read("src/lib/roles.ts");
  assert.match(roles, /"settings\.legal\.publish"/);
  const management = roles.match(/const businessManagement = \[(.*?)\] as const/s)?.[1] ?? "";
  assert.doesNotMatch(management, /settings\.legal\.publish/);

  const route = read("src/app/api/admin/configuracion/route.ts");
  assert.match(route, /settings\.legal\.publish/);
  assert.match(route, /COMPANY_SETTINGS_LEGAL_PUBLISH_FORBIDDEN/);
  assert.match(route, /company\.legal_pages_publication_updated/);
  assert.match(route, /company\.settings_updated/);
  assert.match(route, /company-settings:public/);

  const form = read("src/components/admin/CompanySettingsForm.tsx");
  assert.match(form, /canPublishLegalPages/);
  assert.match(form, /Publicar p.ginas legales/);
});

test("la migraciÃ³n es aditiva y el valor inicial es apagado", () => {
  assert.match(read("src/db/schema.ts"), /legalPagesPublished: boolean\("legal_pages_published"\)\.notNull\(\)\.default\(false\)/);
  assert.match(read("drizzle/0052_soft_marauders.sql"), /ADD COLUMN "legal_pages_published" boolean DEFAULT false NOT NULL/);
  assert.match(read("src/lib/company-settings-runtime.ts"), /legalPagesPublished: false/);
});
