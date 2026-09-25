import type { Product } from "@/types/product";
import { quoteConfig } from "@/lib/env";

import { isValidPeruvianDni, isValidPeruvianRuc } from "@/lib/peru-documents";

export type QuoteCustomerType = "natural" | "company";
export type QuotePreferredContact = "whatsapp" | "phone" | "email";


export type QuotePayload = {
  name: string;
  customerType: QuoteCustomerType;
  documentNumber: string;
  phone: string;
  email?: string;
  department: string;
  province: string;
  district: string;
  preferredContact: QuotePreferredContact;
  consent: boolean;
  productSlug?: string;
  productName?: string;
  sku?: string;
  message: string;
  itemCount?: number;
};

export type QuoteField =
  | "name"
  | "customerType"
  | "documentNumber"
  | "phone"
  | "email"
  | "department"
  | "province"
  | "district"
  | "preferredContact"
  | "consent"
  | "message"
  | "items";

export type QuoteProductReference = Pick<Product, "slug" | "name" | "sku">;

export type QuoteValidationResult =
  | { ok: true; data: QuotePayload; errors: Record<string, never> }
  | { ok: false; data: null; errors: Partial<Record<QuoteField, string>> };

type RateLimitBucket = { count: number; resetAt: number };
type RateLimitResult = { allowed: boolean; limit: number; remaining: number; retryAfterMs: number; resetAt: number };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedCustomerTypes = new Set<QuoteCustomerType>(["natural", "company"]);
const allowedPreferredContacts = new Set<QuotePreferredContact>(["whatsapp", "phone", "email"]);

export const maxLengths = {
  name: 80,
  documentNumber: 20,
  phone: 24,
  email: 120,
  department: 80,
  province: 80,
  district: 80,
  productSlug: 120,
  productName: 140,
  sku: 60,
  message: 800,
} as const;

const globalRateLimitStore = globalThis as typeof globalThis & {
  __coldpowerQuoteRateLimit?: Map<string, RateLimitBucket>;
};
const quoteRateLimitStore =
  globalRateLimitStore.__coldpowerQuoteRateLimit ??
  (globalRateLimitStore.__coldpowerQuoteRateLimit = new Map<string, RateLimitBucket>());

export function validateQuotePayload(payload: unknown, options: { requireItems?: boolean } = {}): QuoteValidationResult {
  const input = isRecord(payload) ? payload : {};
  const customerType = isQuoteCustomerType(input.customerType) ? input.customerType : "natural";
  const requestedPreferredContact = isQuotePreferredContact(input.preferredContact) ? input.preferredContact : null;
  const itemCount = typeof input.itemCount === "number" && Number.isInteger(input.itemCount) ? Math.max(0, input.itemCount) : 0;
  const data = {
    name: sanitizeText(input.name, maxLengths.name),
    customerType,
    documentNumber: sanitizeText(input.documentNumber, maxLengths.documentNumber).replace(/\D/g, ""),
    phone: normalizePhone(input.phone, maxLengths.phone),
    email: sanitizeText(input.email, maxLengths.email).toLowerCase(),
    department: sanitizeText(input.department, maxLengths.department),
    province: sanitizeText(input.province, maxLengths.province),
    district: sanitizeText(input.district, maxLengths.district),
    preferredContact: requestedPreferredContact ?? "whatsapp",
    consent: input.consent === true,
    productSlug: sanitizeText(input.productSlug, maxLengths.productSlug),
    productName: sanitizeText(input.productName, maxLengths.productName),
    sku: sanitizeText(input.sku, maxLengths.sku),
    message: sanitizeText(input.message, maxLengths.message),
    itemCount,
  } as QuotePayload;
  const errors: Partial<Record<QuoteField, string>> = {};

  if (!data.name) errors.name = "Ingresa tu nombre para que un asesor pueda identificarte.";
  if (data.documentNumber) {
    const valid = data.customerType === "company" ? isValidPeruvianRuc(data.documentNumber) : isValidPeruvianDni(data.documentNumber);
    if (!valid) errors.documentNumber = data.customerType === "company" ? "Ingresa un RUC peruano válido (11 dígitos y prefijo SUNAT)." : "El DNI debe tener exactamente 8 dígitos.";
  }
  if (!data.phone && !data.email) errors.phone = "Ingresa un teléfono o un correo para que podamos contactarte.";
  else if (data.phone && data.phone.replace(/\D/g, "").length < 7) errors.phone = "Ingresa un teléfono válido con código de ciudad o país.";
  if (data.email && !emailPattern.test(data.email)) errors.email = "Ingresa un correo válido o deja este campo vacío.";
  if (options.requireItems && !data.productSlug && itemCount < 1) errors.items = "Agrega al menos una referencia a la solicitud.";
  if (!data.message) data.message = "Solicitud de cotización desde el catálogo.";

  if (Object.keys(errors).length > 0) return { ok: false, data: null, errors };
  return { ok: true, data, errors: {} };
}

export function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function normalizePhone(value: unknown, maxLength = maxLengths.phone) {
  if (typeof value !== "string") return "";
  return value.replace(/[^\d+()\-\s]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function checkQuoteRateLimit(identifier: string, now = Date.now()): RateLimitResult {
  const key = identifier || "anonymous";
  const limit = quoteConfig.quoteRateLimit.max;
  const windowMs = quoteConfig.quoteRateLimit.windowMs;
  const existing = quoteRateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    quoteRateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, limit, remaining: Math.max(0, limit - 1), retryAfterMs: windowMs, resetAt: now + windowMs };
  }
  if (existing.count >= limit) return { allowed: false, limit, remaining: 0, retryAfterMs: Math.max(0, existing.resetAt - now), resetAt: existing.resetAt };
  existing.count += 1;
  quoteRateLimitStore.set(key, existing);
  return { allowed: true, limit, remaining: Math.max(0, limit - existing.count), retryAfterMs: Math.max(0, existing.resetAt - now), resetAt: existing.resetAt };
}

export function resetQuoteRateLimitForTests() {
  quoteRateLimitStore.clear();
}

export function generateQuoteId(date = new Date(), random = Math.random()) {
  const datePart = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("");
  const randomPart = Math.floor(random * 36 ** 4).toString(36).toUpperCase().padStart(4, "0").slice(0, 4);
  return `CP-${datePart}-${randomPart}`;
}

export function buildQuotePayload(
  form: Pick<QuotePayload, "name" | "customerType" | "documentNumber" | "phone" | "email" | "department" | "province" | "district" | "preferredContact" | "consent" | "message">,
  product?: QuoteProductReference,
  itemCount = 0,
): QuotePayload {
  return { ...form, productSlug: product?.slug, productName: product?.name, sku: product?.sku, itemCount: itemCount + (product ? 1 : 0) };
}

export function buildQuoteWhatsAppMessage(payload: QuotePayload, quoteId?: string) {
  return [
    "Hola ColdPower, deseo continuar una solicitud de cotización.",
    quoteId ? `Código temporal: ${quoteId}` : undefined,
    `Cliente: ${payload.name || "Por completar"}`,
    `Tipo: ${payload.customerType === "company" ? "Empresa" : "Persona natural"}`,
    `Documento: ${payload.documentNumber || "Por completar"}`,
    `Teléfono: ${payload.phone || "Por completar"}`,
    payload.email ? `Correo: ${payload.email}` : undefined,
    `Ubicación: ${[payload.department, payload.province, payload.district].filter(Boolean).join(" / ") || "Por completar"}`,
    `Contacto preferido: ${payload.preferredContact || "Por completar"}`,
    `Producto de interés: ${payload.productName || "Por definir"}`,
    payload.sku ? `SKU: ${payload.sku}` : "SKU: Por definir",
    `Mensaje: ${payload.message || "Por completar"}`,
  ].filter(Boolean).join("\n");
}

function isQuoteCustomerType(value: unknown): value is QuoteCustomerType {
  return typeof value === "string" && allowedCustomerTypes.has(value as QuoteCustomerType);
}

function isQuotePreferredContact(value: unknown): value is QuotePreferredContact {
  return typeof value === "string" && allowedPreferredContacts.has(value as QuotePreferredContact);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
