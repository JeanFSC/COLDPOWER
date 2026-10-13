import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("pipeline opens the linked quote detail instead of searching an internal ID", () => {
  const pipeline = readFileSync("src/components/admin/PipelineWorkspace.tsx", "utf8");
  const quotes = readFileSync("src/components/admin/QuotesWorkspace.tsx", "utf8");
  assert.match(pipeline, /cotizaciones\?quoteId=\$\{encodeURIComponent\(detail\.quoteId\)\}/);
  assert.doesNotMatch(pipeline, /cotizaciones\?query=\$\{encodeURIComponent\(detail\.quoteId\)\}/);
  assert.match(quotes, /params\.get\("quoteId"\)/);
  assert.match(pipeline, /Abrir cotización vinculada/);
  assert.match(pipeline, /cotizaciones\?new=1&opportunityId=\$\{encodeURIComponent\(detail\.id\)\}/);
  assert.match(quotes, /params\.get\("new"\) === "1"/);
  assert.match(quotes, /\[detailLoading, setDetailLoading\] = useState\(Boolean\(params\.get\("quoteId"\)\)\)/);
});
