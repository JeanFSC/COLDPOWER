import type { Product } from "@/types/product";
import { quoteConfig } from "@/lib/env";

export type QuotePayload = {
  name: string;
  phone: string;
  email?: string;
  productSlug?: string;
  productName?: string;
  sku?: string;
  message: string;
};

export type QuoteField = keyof Pick<QuotePayload, "name" | "phone" | "email" | "message">;

export type QuoteValidationResult =
  | {
      ok: true;
      data: QuotePayload;
      errors: Record<string, never>;
    }
  | {
      ok: false;
      data: null;
      errors: Partial<Record<QuoteField, string>>;
    };

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterMs: number;
  resetAt: number;
};

const minimumMessageLength = 12;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const maxLengths = {
  name: 80,
  phone: 24,
  email: 120,
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

export function validateQuotePayload(payload: unknown): QuoteValidationResult {
  const input = isRecord(payload) ? payload : {};
  const data: QuotePayload = {
    name: sanitizeText(input.name, maxLengths.name),
    phone: normalizePhone(input.phone, maxLengths.phone),
    email: sanitizeText(input.email, maxLengths.email).toLowerCase(),
    productSlug: sanitizeText(input.productSlug, maxLengths.productSlug),
    productName: sanitizeText(input.productName, maxLengths.productName),
    sku: sanitizeText(input.sku, maxLengths.sku),
    message: sanitizeText(input.message, maxLengths.message),
  };
  const errors: Partial<Record<QuoteField, string>> = {};

  if (!data.name) {
    errors.name = "Ingresa tu nombre para que un asesor pueda identificarte.";
  }

  if (!data.phone) {
    errors.phone = "Ingresa un teléfono de contacto.";
  } else if (data.phone.replace(/\D/g, "").length < 7) {
    errors.phone = "Ingresa un teléfono válido con código de ciudad o país.";
  }

  if (data.email && !emailPattern.test(data.email)) {
    errors.email = "Ingresa un correo válido o deja este campo vacío.";
  }

  if (data.message.length < minimumMessageLength) {
    errors.message = `Escribe un mensaje de al menos ${minimumMessageLength} caracteres.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, data: null, errors };
  }

  return { ok: true, data, errors: {} };
}

export function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizePhone(value: unknown, maxLength = maxLengths.phone) {
  if (typeof value !== "string") {
    return "";
  }

  const sanitized = value
    .replace(/[^\d+()\-\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized.slice(0, maxLength);
}

export function checkQuoteRateLimit(identifier: string, now = Date.now()): RateLimitResult {
  const key = identifier || "anonymous";
  const limit = quoteConfig.quoteRateLimit.max;
  const windowMs = quoteConfig.quoteRateLimit.windowMs;
  const existing = quoteRateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    quoteRateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      retryAfterMs: windowMs,
      resetAt: now + windowMs,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  quoteRateLimitStore.set(key, existing);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterMs: Math.max(0, existing.resetAt - now),
    resetAt: existing.resetAt,
  };
}

export function resetQuoteRateLimitForTests() {
  quoteRateLimitStore.clear();
}

export function generateQuoteId(date = new Date(), random = Math.random()) {
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const randomPart = Math.floor(random * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0")
    .slice(0, 4);

  return `CP-${datePart}-${randomPart}`;
}

export function buildQuotePayload(
  form: Pick<QuotePayload, "name" | "phone" | "email" | "message">,
  product?: Product,
): QuotePayload {
  return {
    name: form.name,
    phone: form.phone,
    email: form.email,
    productSlug: product?.slug,
    productName: product?.name,
    sku: product?.sku,
    message: form.message,
  };
}

export function buildQuoteWhatsAppMessage(payload: QuotePayload, quoteId?: string) {
  return [
    "Hola ColdPower, deseo continuar una solicitud de cotización.",
    quoteId ? `Código temporal: ${quoteId}` : undefined,
    `Nombre: ${payload.name || "Por completar"}`,
    `Teléfono: ${payload.phone || "Por completar"}`,
    payload.email ? `Correo: ${payload.email}` : undefined,
    `Producto de interés: ${payload.productName || "Por definir"}`,
    payload.sku ? `SKU: ${payload.sku}` : "SKU: Por definir",
    `Mensaje: ${payload.message || "Por completar"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
