import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PriceCell } from "../src/components/admin/PricingWorkspace";
import type { PricingPriceRecord } from "../src/lib/pricing-contract";

test("price cells identify inactive, expired and scheduled amounts", () => {
  const base = { id: "qa", priceType: "SPECIAL", amount: "22", currency: "PEN", active: true, status: "ACTIVE", validFrom: new Date("2000-01-01"), validUntil: null } as PricingPriceRecord;
  for (const [price, label] of [
    [{ ...base, active: false }, "Inactivo"],
    [{ ...base, validUntil: new Date("2001-01-01") }, "Vencido"],
    [{ ...base, validFrom: new Date("2099-01-01") }, "Programado"],
    [{ ...base, status: "ARCHIVED" }, "Archivado"],
  ] as const) {
    const markup = renderToStaticMarkup(<PriceCell price={price} label="Precio especial" />);
    assert.match(markup, new RegExp(label));
    assert.match(markup, /22[.,]00/);
  }
  assert.doesNotMatch(renderToStaticMarkup(<PriceCell price={base} label="Precio especial" />), /Inactivo|Vencido|Programado|Archivado/);
  assert.match(renderToStaticMarkup(<PriceCell price={null} label="Precio especial" />), /—/);
});
