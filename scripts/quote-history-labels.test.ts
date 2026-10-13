import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteStatusEnum } from "../src/db/schema";
import { quoteHistoryStatusLabel } from "../src/lib/quote-workflow";

test("every persisted quote history status has a readable label", () => {
  for (const status of quoteStatusEnum.enumValues) {
    assert.notEqual(quoteHistoryStatusLabel(status), "Estado no clasificado", status);
  }
  assert.equal(quoteHistoryStatusLabel("borrador"), "Borrador");
  assert.equal(quoteHistoryStatusLabel("DRAFT"), "Borrador");
  assert.equal(quoteHistoryStatusLabel("cerrada"), "Cerrada (histórico)");
  assert.equal(quoteHistoryStatusLabel("unknown"), "Estado no clasificado");
});
