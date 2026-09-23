import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

assert.equal(existsSync(join(root, "src/lib/analytics.ts")), true, "analytics contract should exist");
assert.equal(existsSync(join(root, "src/app/api/eventos/route.ts")), true, "event endpoint should exist");

const analytics = read("src/lib/analytics.ts");
for (const event of [
  "search_submitted",
  "search_zero_results",
  "search_result_clicked",
  "filter_applied",
  "product_viewed",
  "compatibility_checked",
  "compare_added",
  "quote_item_added",
  "quote_started",
  "quote_submitted",
  "whatsapp_clicked",
  "document_downloaded",
  "product_not_found_sent",
]) {
  assert.match(analytics, new RegExp(`['\"]${event}['\"]`), `event ${event} should be supported`);
}

const quoteForm = read("src/components/quote/QuoteForm.tsx");
const transaction = read("src/components/product/TransactionBox.tsx");
const compatibility = read("src/components/product/CompatibilityPanel.tsx");
const quoteButton = read("src/components/cart/AddToQuoteButton.tsx");
const whatsappButton = read("src/components/shared/WhatsAppLeadButton.tsx");
assert.match(quoteForm, /quote_started|quote_submitted/, "quote form should emit lifecycle events");
assert.match(transaction, /product_viewed/, "transaction box should emit product view events");
assert.match(quoteButton, /quote_item_added/, "quote button should emit commercial events");
assert.match(whatsappButton, /whatsapp_clicked/, "WhatsApp lead button should emit commercial events");
assert.match(compatibility, /compatibility_checked/, "compatibility panel should emit validation events");

const endpoint = read("src/app/api/eventos/route.ts");
assert.match(endpoint, /NextResponse/, "event endpoint should return a response");
assert.match(endpoint, /400|405/, "event endpoint should validate the request");

console.log("Phase 20 quote and analytics events: PASS");
