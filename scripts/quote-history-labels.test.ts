import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteStatusEnum, quoteVersionStatusEnum } from "../src/db/schema";
import { quoteHistoryStatusLabel } from "../src/lib/quote-workflow";
import { quotePdfVersionNumber, quoteRevisionLabel, quoteVersionStatusLabel } from "../src/lib/quote-version-display";

test("PDF labels follow the accepted snapshot before the latest registered version", () => {
  const versions = [{ id: "v2", versionNumber: 2 }, { id: "v1", versionNumber: 1 }];
  assert.equal(quotePdfVersionNumber(versions, "v1"), 1);
  assert.equal(quotePdfVersionNumber(versions, null), 2);
  assert.equal(quotePdfVersionNumber(versions, "missing"), 2);
  assert.equal(quotePdfVersionNumber([], null), null);
});

test("every persisted quote version status is translated", () => {
  for (const status of quoteVersionStatusEnum.enumValues) assert.notEqual(quoteVersionStatusLabel(status), "Estado no clasificado", status);
  assert.equal(quoteVersionStatusLabel("SUPERSEDED"), "Reemplazada");
});

test("quote draft labels distinguish a pending revision from its registered snapshot", () => {
  assert.equal(quoteRevisionLabel("DRAFT", 0), "Borrador de v1");
  assert.equal(quoteRevisionLabel("DRAFT", 1), "Borrador de v2");
  assert.equal(quoteRevisionLabel("SENT", 1), "v1");
  assert.equal(quoteRevisionLabel("ACCEPTED", 2), "v2");
  assert.equal(quoteRevisionLabel("EXPIRED", 0), "Sin versión registrada");
});

test("every persisted quote history status has a readable label", () => {
  for (const status of quoteStatusEnum.enumValues) {
    assert.notEqual(quoteHistoryStatusLabel(status), "Estado no clasificado", status);
  }
  assert.equal(quoteHistoryStatusLabel("borrador"), "Borrador");
  assert.equal(quoteHistoryStatusLabel("DRAFT"), "Borrador");
  assert.equal(quoteHistoryStatusLabel("cerrada"), "Cerrada (histórico)");
  assert.equal(quoteHistoryStatusLabel("unknown"), "Estado no clasificado");
});
