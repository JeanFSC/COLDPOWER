import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const CONTACT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const allowedContactAttachmentTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type AllowedContactAttachmentType = (typeof allowedContactAttachmentTypes)[number];

const attachmentRoot = path.join(process.cwd(), "tmp", "contact-attachments");
const extensions: Record<AllowedContactAttachmentType, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
};

function resolveStoragePath(storageKey: string) {
  const resolved = path.resolve(attachmentRoot, storageKey);
  if (path.dirname(resolved) !== path.resolve(attachmentRoot) || path.basename(resolved) !== storageKey) throw new Error("Clave de adjunto inválida.");
  return resolved;
}

function startsWith(bytes: Uint8Array, signature: number[]) { return signature.every((value, index) => bytes[index] === value); }

function matchesSignature(mimeType: AllowedContactAttachmentType, bytes: Uint8Array) {
  if (mimeType === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (mimeType === "image/png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mimeType === "image/webp") return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes.length >= 12 && startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50]);
  return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
}

export function validateContactAttachment(input: { filename: string; mimeType: string; size: number; bytes: Uint8Array }) {
  const mimeType = input.mimeType as AllowedContactAttachmentType;
  if (!(allowedContactAttachmentTypes as readonly string[]).includes(input.mimeType)) return { ok: false as const, error: "Adjunta un JPG, PNG, WEBP o PDF." };
  if (!Number.isSafeInteger(input.size) || input.size < 1 || input.size > CONTACT_ATTACHMENT_MAX_BYTES) return { ok: false as const, error: "El archivo debe pesar como máximo 10 MB." };
  const extension = input.filename.split(".").pop()?.toLowerCase() ?? "";
  if (!extensions[mimeType].includes(extension)) return { ok: false as const, error: "La extensión del archivo no coincide con su tipo." };
  if (!matchesSignature(mimeType, input.bytes)) return { ok: false as const, error: "El contenido del archivo no coincide con su tipo." };
  return { ok: true as const, mimeType, extension };
}

export function contactAttachmentStorageKey(id: string, extension: string) { return `${id}.${extension}`; }
export function contactAttachmentStorageRoot() { return attachmentRoot; }
export async function writeContactAttachment(storageKey: string, bytes: Uint8Array) { await mkdir(attachmentRoot, { recursive: true }); await writeFile(resolveStoragePath(storageKey), bytes, { flag: "wx" }); }
export async function removeContactAttachment(storageKey: string) { try { await unlink(resolveStoragePath(storageKey)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; } }
