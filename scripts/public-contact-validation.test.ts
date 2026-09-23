import assert from "node:assert/strict";
import test from "node:test";
import { validateContactAttachment } from "@/lib/contact-attachments";
import { createPublicRateLimiter } from "@/lib/public-rate-limit";
import { validatePublicContactPayload } from "@/lib/public-contact-validation";

const requestId = "contact-123456789012345678901234";

test("valida y normaliza una consulta pública completa", () => {
  const result = validatePublicContactPayload({
    name: "  Ana <Salas>  ",
    company: " Frío Norte ",
    phone: "+51 987 654 321",
    email: " ANA@EXAMPLE.COM ",
    message: "Necesito validar el compresor para un equipo comercial.",
    consent: "on",
    requestId,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.name, "Ana Salas");
    assert.equal(result.data.company, "Frío Norte");
    assert.equal(result.data.email, "ana@example.com");
    assert.equal(result.data.consent, true);
  }
});

test("rechaza campos obligatorios, consentimiento e idempotency key inválida", () => {
  const result = validatePublicContactPayload({ name: "A", phone: "12", email: "no-es-correo", message: "corto", consent: false, requestId: "bad" });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.name);
    assert.ok(result.errors.phone);
    assert.ok(result.errors.email);
    assert.ok(result.errors.message);
    assert.ok(result.errors.consent);
  }
});

test("acepta firmas de archivos permitidos y rechaza un MIME falsificado", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
  const valid = validateContactAttachment({ filename: "placa.jpg", mimeType: "image/jpeg", size: jpeg.byteLength, bytes: jpeg });
  assert.equal(valid.ok, true);

  const invalid = validateContactAttachment({ filename: "placa.jpg", mimeType: "image/jpeg", size: 4, bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) });
  assert.equal(invalid.ok, false);
});

test("aplica el límite de solicitudes por ventana", () => {
  const limiter = createPublicRateLimiter({ max: 2, windowMs: 1_000 });
  assert.equal(limiter.check("ip", 10).allowed, true);
  assert.equal(limiter.check("ip", 11).allowed, true);
  assert.equal(limiter.check("ip", 12).allowed, false);
  assert.equal(limiter.check("ip", 1_011).allowed, true);
});
