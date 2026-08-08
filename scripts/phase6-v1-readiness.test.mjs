import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function file(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return readFileSync(file(relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const requiredFiles = [
  "src/app/nosotros/page.tsx",
  "src/app/contacto/page.tsx",
  "src/app/not-found.tsx",
  "src/components/shared/FinalCTA.tsx",
  "src/data/company.ts",
  "docs/v1-status.md",
];

for (const relativePath of requiredFiles) {
  assert(existsSync(file(relativePath)), `${relativePath} should exist`);
}

const aboutPage = read("src/app/nosotros/page.tsx");
const contactPage = read("src/app/contacto/page.tsx");
const notFoundPage = read("src/app/not-found.tsx");
const finalCta = read("src/components/shared/FinalCTA.tsx");
const companyData = read("src/data/company.ts");
const layout = read("src/app/layout.tsx");
const searchPage = read("src/app/buscar/page.tsx");
const searchResults = read("src/components/catalog/SearchResults.tsx");
const docs = read("docs/v1-status.md");

assert(
  aboutPage.includes("Nosotros | ColdPower"),
  "About page should include required title metadata",
);
assert(aboutPage.includes("Quiénes somos"), "About page should include Quienes somos section");
assert(
  aboutPage.includes("Por qué elegir ColdPower"),
  "About page should include why choose section",
);
for (const value of [
  "Confianza",
  "Garantía",
  "Asesoría especializada",
  "Rapidez",
  "Cobertura nacional",
]) {
  assert(aboutPage.includes(value), `About page should include value: ${value}`);
}

assert(
  contactPage.includes("Contacto | ColdPower"),
  "Contact page should include required title metadata",
);
assert(
  contactPage.includes("company.") && contactPage.includes("branches"),
  "Contact page should use centralized company/branch data",
);
assert(contactPage.includes("Mapa referencial"), "Contact page should include a map placeholder");
assert(contactPage.includes("/cotizacion"), "Contact page should link to quote flow");

assert(
  notFoundPage.includes("No encontramos esta página"),
  "not-found page should include the required message",
);
assert(notFoundPage.includes("Volver al catálogo"), "not-found page should link back to catalog");
assert(notFoundPage.includes("Cotizar por WhatsApp"), "not-found page should expose WhatsApp CTA");

assert(finalCta.includes("FinalCTA"), "FinalCTA component should be implemented");
assert(aboutPage.includes("FinalCTA"), "About page should use FinalCTA");
assert(contactPage.includes("FinalCTA"), "Contact page should use FinalCTA");
assert(searchResults.includes("FinalCTA"), "Empty/search assistance should use FinalCTA");

for (const field of [
  "commercialName",
  "domain",
  "primaryPhone",
  "whatsapp",
  "commercialEmail",
  "schedule",
  "address",
  "socialLinks",
  "ruc",
]) {
  assert(companyData.includes(field), `company data should centralize ${field}`);
}

assert(layout.includes("metadataBase"), "Global layout should include metadataBase");
assert(layout.includes("openGraph"), "Global layout should include Open Graph metadata");
assert(layout.includes("alternates"), "Global layout should include canonical alternates");

assert(
  searchPage.includes("sanitizeQuery") || searchPage.includes("normalizeQuery"),
  "Search page should validate/sanitize query param",
);
assert(
  searchResults.includes("No encontramos ese producto, solicita asesoría"),
  "Search empty state should include advisory CTA copy",
);

const filesToCheckForHardcodedWhatsapp = [
  "src/app/page.tsx",
  "src/components/home/Hero.tsx",
  "src/components/home/PromoBanner.tsx",
  "src/components/layout/MobileMenu.tsx",
  "src/components/shared/WhatsAppCTA.tsx",
  "src/components/catalog/ProductCard.tsx",
  "src/components/product/ProductDetail.tsx",
  "src/components/quote/QuoteForm.tsx",
  "src/app/contacto/page.tsx",
  "src/app/nosotros/page.tsx",
  "src/app/not-found.tsx",
];

for (const relativePath of filesToCheckForHardcodedWhatsapp) {
  assert(
    !read(relativePath).includes("51900000000"),
    `${relativePath} should not hardcode WhatsApp number`,
  );
}

for (const section of [
  "Qué está implementado",
  "Rutas disponibles",
  "Qué sigue siendo mock",
  "Cómo correr el proyecto",
  "Validaciones",
  "Pendientes para producción",
  "Próxima fase recomendada",
]) {
  assert(docs.includes(section), `docs/v1-status.md should include ${section}`);
}
