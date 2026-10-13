import assert from "node:assert/strict";
import test from "node:test";
import { promotionCalendarPresentation, promotionCalendarStates, promotionExportHref } from "../src/lib/promotion-calendar-presentation";

test("calendar states distinguish paused and expired campaigns from drafts", () => {
  for (const effectiveStatus of ["ACTIVE", "SCHEDULED", "DRAFT", "INACTIVE", "EXPIRED"] as const) {
    assert.equal(promotionCalendarPresentation({ effectiveStatus, approvalStatus: "NOT_REQUIRED" }), promotionCalendarStates[effectiveStatus]);
  }
  assert.notEqual(promotionCalendarStates.INACTIVE.color, promotionCalendarStates.DRAFT.color);
  assert.notEqual(promotionCalendarStates.EXPIRED.color, promotionCalendarStates.DRAFT.color);
});

test("pending approval does not disguise paused or expired campaigns", () => {
  assert.equal(promotionCalendarPresentation({ effectiveStatus: "DRAFT", approvalStatus: "PENDING" }).label, "Por aprobar");
  assert.equal(promotionCalendarPresentation({ effectiveStatus: "INACTIVE", approvalStatus: "PENDING" }).label, "Pausada");
  assert.equal(promotionCalendarPresentation({ effectiveStatus: "EXPIRED", approvalStatus: "PENDING" }).label, "Vencida");
});

test("export formats retain filters and replace an existing format", () => {
  assert.equal(promotionExportHref("/api/admin/promociones/export", "xlsx"), "/api/admin/promociones/export?format=xlsx");
  const parsed = new URL(promotionExportHref("/api/admin/promociones/export?status=INACTIVE&q=QA%20AUDITOR%C3%8DA&format=csv", "xlsx"), "http://localhost");
  assert.equal(parsed.searchParams.get("status"), "INACTIVE");
  assert.equal(parsed.searchParams.get("q"), "QA AUDITORÍA");
  assert.deepEqual(parsed.searchParams.getAll("format"), ["xlsx"]);
});
