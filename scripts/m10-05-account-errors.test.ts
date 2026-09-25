import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountLoadError } from "../src/components/account/AccountLoadError";
import { emptyAccountOverview } from "../src/lib/account-overview";
import { logAccountLoadError } from "../src/lib/account-errors";
import { loadAccountPageData } from "../src/lib/account-page-data";

test("M10-05 no convierte un fallo del hub en EmptyAccount", async () => {
  const result = await loadAccountPageData("user-test", "customer", {
    getAccountHubData: async () => {
      throw new Error("forced database failure");
    },
    listPurchasedProductsForUser: async () => [],
  });

  assert.deepEqual(result, { kind: "error" });
  assert.notEqual(result.kind, "empty");

  const markup = renderToStaticMarkup(AccountLoadError({}));
  assert.match(markup, /No pudimos cargar tu cuenta/);
  assert.match(markup, /Reintentar/);
  assert.doesNotMatch(markup, /Tu cuenta/);
});

test("M10-05 degrada solo Volver a comprar si falla su consulta", async () => {
  const hub = {
    overview: emptyAccountOverview("customer"),
    attention: [],
    currentOrder: null,
    recentQuotes: [],
    recentOrders: [],
  };
  const result = await loadAccountPageData("user-test", "customer", {
    getAccountHubData: async () => hub,
    listPurchasedProductsForUser: async () => {
      throw new Error("forced history failure");
    },
  });

  assert.equal(result.kind, "ready");
  if (result.kind === "ready") {
    assert.equal(result.data, hub);
    assert.equal(result.repeatPurchaseFailed, true);
    assert.deepEqual(result.products, []);
  }
});

test("M10-05 registra solo metadatos seguros del fallo", () => {
  const originalError = console.error;
  const entries: unknown[] = [];
  console.error = (...args: unknown[]) => entries.push(args);

  try {
    logAccountLoadError("hub", new Error("secret database details"));
  } finally {
    console.error = originalError;
  }

  const serialized = JSON.stringify(entries);
  assert.match(serialized, /errorName/);
  assert.doesNotMatch(serialized, /secret database details/);
});
