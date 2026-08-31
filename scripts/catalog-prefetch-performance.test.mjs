import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("product cards do not prefetch dynamic product pages", async () => {
  const source = await read("src/components/catalog/ProductCard.tsx");
  assert.ok((source.match(/prefetch=\{false\}/g) ?? []).length >= 2);
});

test("technical catalog navigation does not prefetch every dynamic destination", async () => {
  const source = await read("src/components/layout/TechnicalNav.tsx");
  assert.ok((source.match(/prefetch=\{false\}/g) ?? []).length >= 2);
});

test("category pages do not prefetch the full catalog while being viewed", async () => {
  const source = await read("src/app/categoria/[slug]/page.tsx");
  assert.match(source, /href="\/catalogo"[\s\S]*?prefetch=\{false\}/);
});

test("home category cards and cart navigation do not prefetch dynamic pages", async () => {
  const categoryCard = await read("src/components/home/CategoryCard.tsx");
  const cartButton = await read("src/components/cart/CartButton.tsx");
  assert.match(categoryCard, /<Link href=\{href\} prefetch=\{false\}/);
  assert.match(cartButton, /href="\/cotizacion\?carrito=1"[\s\S]*?prefetch=\{false\}/);
});

test("public catalog entry points do not prefetch catalog queries before navigation", async () => {
  const sources = await Promise.all([
    read("src/components/home/CategoriesGrid.tsx"),
    read("src/components/home/BrandsSection.tsx"),
    read("src/components/home/ApplicationSolutions.tsx"),
    read("src/components/home/PromoBanner.tsx"),
    read("src/components/home/ProductSection.tsx"),
    read("src/components/catalog/BrandsDirectory.tsx"),
    read("src/components/shared/BrandLogo.tsx"),
    read("src/components/layout/Footer.tsx"),
  ]);
  for (const source of sources) {
    assert.ok((source.match(/prefetch=\{false\}/g) ?? []).length > 0);
  }
});
