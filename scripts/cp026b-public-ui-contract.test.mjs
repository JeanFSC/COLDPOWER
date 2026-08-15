import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("public visual system exposes shared tokens and search primitive", async () => {
  const [globals, searchBar, pageHeader] = await Promise.all([
    read("src/app/globals.css"),
    read("src/components/shared/SearchBar.tsx").catch(() => ""),
    read("src/components/shared/PublicPageHeader.tsx").catch(() => ""),
  ]);

  assert.match(globals, /--cp-container/);
  assert.match(globals, /--cp-section/);
  assert.match(searchBar, /export function SearchBar/);
  assert.match(searchBar, /name="q"/);
  assert.match(pageHeader, /export function PublicPageHeader/);
});

test("public copy does not expose infrastructure terminology", async () => {
  const files = [
    "src/components/quote/QuoteForm.tsx",
    "src/components/quote/QuoteSummary.tsx",
    "src/components/home/Hero.tsx",
    "src/components/layout/Footer.tsx",
  ];
  const contents = await Promise.all(files.map(read));
  const publicCopy = contents.join("\n");
  assert.doesNotMatch(publicCopy, /Solicitud persistente|fuente runtime|inventario persistente/i);
});

test("quote flow uses a commercial primary CTA", async () => {
  const quoteForm = await read("src/components/quote/QuoteForm.tsx");
  assert.match(quoteForm, /Solicitar cotizaci[oó]n/);
  assert.doesNotMatch(quoteForm, /Registrar solicitud|Registrando\.\.\./);
});

test("footer navigation only promotes public categories", async () => {
  const footer = await read("src/components/layout/Footer.tsx");
  assert.match(footer, /productCount\s*>\s*0/);
  assert.match(footer, /Explorar catálogo/);
});

test("footer contact column has a recovery action when settings are empty", async () => {
  const footer = await read("src/components/layout/Footer.tsx");
  assert.match(footer, /hasContactDetails/);
  assert.match(footer, /Abrir formulario de contacto/);
});

test("brand navigation only promotes public brands and has a real directory view", async () => {
  const [brandsSection, catalogPage, directory] = await Promise.all([
    read("src/components/home/BrandsSection.tsx"),
    read("src/app/catalogo/page.tsx"),
    read("src/components/catalog/BrandsDirectory.tsx"),
  ]);
  assert.match(brandsSection, /productCount\s*>\s*0/);
  assert.match(catalogPage, /vista.*marcas|marcas.*vista/i);
  assert.match(directory, /marca=|productCount/);
});

test("brand empty state keeps its recovery CTA on a separate line", async () => {
  const directory = await read("src/components/catalog/BrandsDirectory.tsx");
  assert.match(directory, /mt-3 block w-fit font-extrabold/);
});

test("mobile navigation and catalog facets only expose public options", async () => {
  const [mobileMenu, layout, catalogPage, categoryPage] = await Promise.all([
    read("src/components/layout/MobileMenu.tsx"),
    read("src/app/layout.tsx"),
    read("src/app/catalogo/page.tsx"),
    read("src/app/categoria/[slug]/page.tsx"),
  ]);
  assert.match(mobileMenu, /productCount\s*>\s*0/);
  assert.match(mobileMenu, /Explorar catálogo/);
  assert.match(layout, /filter\(.*productCount\s*>\s*0/);
  assert.match(catalogPage, /productCount\s*>\s*0/);
  assert.match(categoryPage, /productCount\s*>\s*0/);
});

test("home solution links resolve to supported catalog states", async () => {
  const [solutions, complements, catalogPage] = await Promise.all([
    read("src/components/home/ApplicationSolutions.tsx"),
    read("src/components/home/ComplementsSection.tsx"),
    read("src/app/catalogo/page.tsx"),
  ]);
  assert.match(solutions, /aplicacion=/);
  assert.match(catalogPage, /aplicacion/);
  assert.match(complements, /relacion=/);
  assert.match(catalogPage, /relacion/);
});

test("assistance phone links preserve configured numbers", async () => {
  const assistance = await read("src/components/home/AssistanceSection.tsx");
  assert.match(assistance, /replace\(\/\\s\/g/);
  assert.doesNotMatch(assistance, /replace\(\/s\/g/);
});

test("assistance exposes an honest fallback when direct channels are absent", async () => {
  const assistance = await read("src/components/home/AssistanceSection.tsx");
  assert.match(assistance, /hasDirectChannels/);
  assert.match(assistance, /Siguiente paso/);
  assert.match(assistance, /formulario/);
  assert.match(assistance, /hasDirectChannels \? [\s\S]*Respuesta comercial[\s\S]*formulario/);
});

test("technical search modes are reflected by their destination pages", async () => {
  const [searchPage, catalogPage] = await Promise.all([
    read("src/app/buscar/page.tsx"),
    read("src/app/catalogo/page.tsx"),
  ]);
  assert.match(searchPage, /params\.modo|getSearchMode/);
  assert.match(catalogPage, /params\.modo|getCatalogMode/);
});

test("assistance links preserve contact context", async () => {
  const contactPage = await read("src/app/contacto/page.tsx");
  assert.match(contactPage, /searchParams|params\.motivo/);
  assert.match(contactPage, /no-encontre|validacion|ayuda-tecnica/);
});

test("technical navigation communicates horizontal overflow on tablet", async () => {
  const technicalNav = await read("src/components/layout/TechnicalNav.tsx");
  assert.match(technicalNav, /overflow-x-auto/);
  assert.match(technicalNav, /gradient-to-l|ChevronRight/);
  assert.match(technicalNav, /despl[aá]zate horizontalmente|scroll/i);
});

test("top bar WhatsApp contact is actionable when configured", async () => {
  const topBar = await read("src/components/layout/TopBar.tsx");
  assert.match(topBar, /createWhatsAppLink/);
  assert.match(topBar, /settings\.whatsapp/);
  assert.doesNotMatch(topBar, /href=\{href === "#"/);
});

test("header gates Clerk state until the client has hydrated", async () => {
  const header = await read("src/components/layout/Header.tsx");
  assert.match(header, /useSyncExternalStore/);
  assert.match(header, /mounted/);
  assert.match(header, /Cargando sesión/);
});

test("mobile menu is not clipped by the desktop header shell", async () => {
  const header = await read("src/components/layout/Header.tsx");
  assert.match(header, /sticky[^\n]*min-w-0/);
  assert.doesNotMatch(header, /overflow-(?:hidden|x-clip)/);
  assert.match(header, /<\/header>\s*<MobileMenu/);
});
