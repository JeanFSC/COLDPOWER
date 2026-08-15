import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const readIfPresent = async (path) => {
  try { return await read(path); } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
};

test("public catalog never queries review as public", async () => {
  const source = await read("src/lib/catalog-repository.ts");
  assert.doesNotMatch(source, /eq\(products\.publicationStatus,\s*["']review["']\)/);
  assert.match(source, /publicationStatus["']?,\s*["']published["']|eq\(products\.publicationStatus,\s*["']published["']\)/);
});

test("admin runtime has no fixed historical date or security IP", async () => {
  const source = `${await readIfPresent("src/components/admin/AdminCategoryViews.tsx")}\n${await read("src/components/admin/AdminDashboardView.tsx")}\n${await read("src/components/admin/AdminCharts.tsx")}`;
  assert.doesNotMatch(source, /25\s+may\.?\s*-\s*24\s+jun\.?\s*2024/i);
  assert.doesNotMatch(source, /190\.12\.45\.23/);
});

test("reports expose product filtering in the request form", async () => {
  const source = await read("src/app/admin/reportes/page.tsx");
  assert.match(source, /name=["']productId["']/);
});

test("admin list pagination is data driven", async () => {
  const source = await readIfPresent("src/components/admin/AdminCategoryViews.tsx");
  if (!source) return;
  assert.doesNotMatch(source, /<button[^>]*>2<\/button>|page-2|Página 2/i);
});
