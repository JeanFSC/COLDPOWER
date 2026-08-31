export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
export const allowedMediaMimeTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const;
export type AllowedMediaMimeType = (typeof allowedMediaMimeTypes)[number];

type MediaValidationInput = { mimeType: string; size: number; bytes: Uint8Array };
type MediaValidationResult = { ok: true; mimeType: AllowedMediaMimeType; content?: string } | { ok: false; error: string };

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function hasMediaSignature(mimeType: AllowedMediaMimeType, bytes: Uint8Array) {
  if (mimeType === "image/png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mimeType === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (mimeType === "image/webp") return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes.length >= 12 && startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50]);
  return true;
}

function sanitizeSvg(bytes: Uint8Array) {
  const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (!/^\s*<svg\b[\s\S]*<\/svg>\s*$/i.test(content)) return null;
  if (/<script\b|<iframe\b|<object\b|<embed\b|on[a-z]+\s*=|javascript\s*:/i.test(content)) return null;
  return content.replace(/<!--([\s\S]*?)-->/g, "");
}

export function validateMediaUpload(input: MediaValidationInput): MediaValidationResult {
  if (!allowedMediaMimeTypes.includes(input.mimeType as AllowedMediaMimeType)) return { ok: false, error: "Tipo de archivo no permitido." };
  if (!Number.isSafeInteger(input.size) || input.size < 1 || input.size > MAX_MEDIA_BYTES) return { ok: false, error: "Tamaño de archivo inválido." };
  if (!(input.bytes instanceof Uint8Array) || input.bytes.byteLength < 1) return { ok: false, error: "Archivo vacío o inválido." };
  const mimeType = input.mimeType as AllowedMediaMimeType;
  if (mimeType === "image/svg+xml") {
    try {
      const content = sanitizeSvg(input.bytes);
      return content ? { ok: true, mimeType, content } : { ok: false, error: "SVG no seguro o inválido." };
    } catch {
      return { ok: false, error: "SVG no válido." };
    }
  }
  return hasMediaSignature(mimeType, input.bytes) ? { ok: true, mimeType } : { ok: false, error: "La firma del archivo no coincide con su tipo." };
}

export function validateAltText(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length <= 300 ? normalized : normalized.slice(0, 300);
}
