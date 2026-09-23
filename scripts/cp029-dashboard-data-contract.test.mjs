import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/components/admin/AdminTanda2Workspaces.tsx", "utf8");
const reportPage = await readFile("src/app/admin/reportes/page.tsx", "utf8");
const reportWorkspace = await readFile("src/components/admin/AdminCategoryViews.tsx", "utf8");

for (const forbidden of [
  "Dalmacia",
  "Bryan",
  "25 may. – 24 jun. 2024",
  "18.6%",
  "12.8%",
  "8.4%",
  "15.0%",
  "Registro operativo",
  "Oportunidad registrada",
  "Pagado",
]) {
  assert.equal(
    source.includes(forbidden),
    false,
    `dashboard must not contain invented value: ${forbidden}`,
  );
}

assert.equal(
  source.includes("Math.round(total * 0.43)"),
  false,
  "pipeline stages must not be inferred from fixed ratios",
);
assert.equal(
  source.includes("Array.from({ length: Math.min(count, 5) })"),
  false,
  "operations lists must not fabricate rows",
);
assert.equal(
  source.includes("data={sparkline}"),
  true,
  "metric cards must pass real sparkline data when available",
);
assert.match(reportPage, /reportError/);
assert.match(reportWorkspace, /error\?: string/);
assert.equal(
  reportWorkspace.includes('<FilterSelect name="range">Período</FilterSelect>'),
  false,
  "reports must not expose generic placeholder filter options",
);
assert.match(reportPage, /min-w-0/);

console.log("cp029-dashboard-data-contract: passed");
