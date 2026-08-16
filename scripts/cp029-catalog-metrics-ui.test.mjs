import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile("src/app/admin/catalogo/page.tsx", "utf8");
const workspace = await readFile("src/components/admin/AdminCategoryViews.tsx", "utf8");
const layout = await readFile("src/app/layout.tsx", "utf8");
const header = await readFile("src/components/layout/Header.tsx", "utf8");
const compareBar = await readFile("src/components/catalog/CompareBar.tsx", "utf8");
const shell = await readFile("src/components/admin/AdminShell.tsx", "utf8");
const dashboard = await readFile("src/components/admin/AdminDashboardView.tsx", "utf8");

assert.match(page, /getAdminCatalogPage/);
assert.match(page, /getAdminCatalogPage\(\{ page: 1, pageSize: 1 \}\)/, "global KPIs must be requested without page filters");
assert.match(page, /metrics=\{\{[\s\S]*totalProducts:\s*catalogContract\.queues\.totalProducts/);
assert.match(page, /publishedProducts:\s*catalogContract\.queues\.publishedProducts/);
assert.match(page, /reviewProducts:\s*catalogContract\.queues\.reviewProducts/);
assert.match(page, /duplicateProducts:\s*catalogContract\.queues\.duplicateProducts/);
assert.match(page, /pagination=\{\{[\s\S]*page:\s*catalog\.page/);
assert.match(page, /queryString=\{catalogQueryString\}/);

assert.match(workspace, /metrics:\s*ProductCatalogMetrics/);
assert.match(workspace, /value:\s*metrics\.totalProducts/);
assert.match(workspace, /value:\s*metrics\.publishedProducts/);
assert.match(workspace, /value:\s*metrics\.reviewProducts/);
assert.match(workspace, /value:\s*metrics\.duplicateProducts/);
assert.match(workspace, /label:\s*["']Duplicados editoriales pendientes/);
assert.match(workspace, /pagination\?:\s*\{ page: number; totalPages: number; totalItems: number \}/);
assert.match(workspace, /hrefForPage/);

assert.match(layout, /<\/AppChrome>[\s\S]*<CompareBar \/>/, "the compare bar must subscribe outside AppChrome's publicAfter node");
assert.match(header, /href="\/comparar"/, "the header compare action must open the compare page");
assert.match(compareBar, /usePathname/, "the compare bar must stay out of admin routes");
assert.match(shell, /overflow-x-clip/);
assert.match(shell, /C&J COLD IMPORT PERÚ E\.I\.R\.L\./);
assert.match(workspace, /const panel = ["'][^\n]*min-w-0/);
assert.match(dashboard, /grid grid-cols-1 gap-2[^\n]*sm:grid-cols-3/);

console.log("CP-029 catalog global metrics UI regression: passed");
