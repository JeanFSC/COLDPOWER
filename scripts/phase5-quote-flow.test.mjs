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
  "src/app/api/cotizacion/route.ts",
  "src/app/cotizacion/page.tsx",
  "src/components/quote/QuoteForm.tsx",
  "src/components/quote/QuoteSummary.tsx",
  "src/components/quote/QuoteSuccess.tsx",
  "src/lib/quote.ts",
  "src/data/company.ts",
];

for (const relativePath of requiredFiles) {
  assert(existsSync(file(relativePath)), `${relativePath} should exist`);
}

const apiRoute = read("src/app/api/cotizacion/route.ts");
const quoteLib = read("src/lib/quote.ts");
const quoteForm = read("src/components/quote/QuoteForm.tsx");
const quoteSummary = read("src/components/quote/QuoteSummary.tsx");
const quoteSuccess = read("src/components/quote/QuoteSuccess.tsx");
const companyData = read("src/data/company.ts");
const quotePage = read("src/app/cotizacion/page.tsx");

assert(apiRoute.includes("export async function POST"), "API route should expose POST");
assert(apiRoute.includes("validateQuotePayload"), "API route should validate server payload");
assert(apiRoute.includes("generateQuoteId"), "API route should generate a quoteId");
assert(apiRoute.includes("NextResponse.json"), "API route should return JSON responses");

assert(quoteLib.includes("generateQuoteId"), "quote lib should include quoteId generation");
assert(quoteLib.includes("CP-"), "quoteId should use the CP prefix");
assert(quoteLib.includes("validateQuotePayload"), "quote lib should include shared validation");
assert(quoteLib.includes("buildQuoteWhatsAppMessage"), "quote lib should build WhatsApp text");

assert(quoteForm.includes("errors"), "QuoteForm should keep client validation errors");
assert(quoteForm.includes("aria-describedby"), "QuoteForm should associate errors with fields");
assert(quoteForm.includes("setIsSubmitting"), "QuoteForm should expose loading state");
assert(quoteForm.includes('fetch("/api/cotizacion"'), "QuoteForm should POST to the temporary API");
assert(
  quoteForm.includes("createWhatsAppLink") && quoteForm.includes("buildQuoteWhatsAppMessage"),
  "QuoteForm should generate a precarged WhatsApp link",
);

assert(
  companyData.includes("La cotización final será confirmada por un asesor"),
  "Company data should include advisor confirmation notice",
);
assert(
  quoteSummary.includes("company.quoteNotice"),
  "Summary should use the centralized advisor confirmation notice",
);
assert(
  quoteSuccess.includes("Solicitud registrada"),
  "Success component should confirm registration",
);
assert(
  quoteSuccess.includes("Volver al catálogo"),
  "Success component should link back to catalog",
);

assert(companyData.includes("commercialName"), "Company data should include commercial name");
assert(companyData.includes("whatsapp"), "Company data should include WhatsApp");
assert(quotePage.includes("QuoteSummary"), "Quote page should render the quote summary");

const forbiddenPattern =
  /\b(checkout|pasarela|payment gateway|stripe|cms|admin panel|panel admin|base de datos)\b/i;
const phase5Sources = [apiRoute, quoteLib, quoteForm, quoteSummary, quoteSuccess, quotePage].join(
  "\n",
);
assert(
  !forbiddenPattern.test(phase5Sources),
  "Phase 5 quote flow should not introduce checkout, payments, CMS, admin panel or database work",
);
