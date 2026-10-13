import assert from "node:assert/strict";
import test from "node:test";
import { crmActivityLabel, crmFollowupStatusLabel } from "../src/lib/crm-activity-label";

test("Los tipos de actividad CRM usan etiquetas comerciales en español", () => {
  for (const [code, label] of Object.entries({ CALL: "Llamada", WHATSAPP: "WhatsApp", EMAIL: "Correo", MEETING: "Reunión", TASK: "Tarea", NOTE: "Nota" })) {
    assert.equal(crmActivityLabel(code), label);
  }
  assert.equal(crmActivityLabel("UNRECOGNIZED"), "Actividad");
});

test("Los seguimientos presentan estados legibles sin exponer códigos", () => {
  for (const [code, label] of Object.entries({ PENDING: "Pendiente", COMPLETED: "Completado", CANCELLED: "Cancelado", OVERDUE: "Vencido" })) {
    assert.equal(crmFollowupStatusLabel(code), label);
  }
  assert.equal(crmFollowupStatusLabel("UNRECOGNIZED"), "Estado desconocido");
});
