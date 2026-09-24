import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public product and category cards avoid eager dynamic prefetch", async () => {
  const [productCard, homeCard, categoryCard] = await Promise.all([
    read("src/components/catalog/ProductCard.tsx"),
    read("src/components/home/HomeProductCard.tsx"),
    read("src/components/home/CategoryCard.tsx"),
  ]);
  for (const source of [productCard, homeCard, categoryCard]) assert.match(source, /prefetch=\{false\}/);
});

test("public navigation uses deliberate prefetch boundaries", async () => {
  const [footer, brands, productSection, cart, homeCard] = await Promise.all([
    read("src/components/layout/Footer.tsx"),
    read("src/components/home/BrandsSection.tsx"),
    read("src/components/home/ProductSection.tsx"),
    read("src/components/cart/CartButton.tsx"),
    read("src/components/home/HomeProductCard.tsx"),
  ]);
  for (const source of [footer, brands, cart, homeCard]) assert.match(source, /prefetch=\{false\}/);
  // ProductSection delegates product navigation to HomeProductCard. It has no
  // direct Link boundary, so its contract is delegation rather than a stale
  // prefetch prop assertion on the parent component.
  assert.match(productSection, /<HomeProductTabs\s+products=\{products\}/);
});

