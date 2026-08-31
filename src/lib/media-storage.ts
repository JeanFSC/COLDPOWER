import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AllowedMediaMimeType } from "@/lib/media-validation";

const mediaRoot = path.join(process.cwd(), "tmp", "media");
const extensions: Record<AllowedMediaMimeType, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" };
export function mediaStorageRoot() { return mediaRoot; }
export function storageKeyFor(id: string, mimeType: AllowedMediaMimeType) { return `${id}.${extensions[mimeType]}`; }
function resolveStoragePath(storageKey: string) { const resolved = path.resolve(mediaRoot, storageKey); if (path.dirname(resolved) !== path.resolve(mediaRoot) || path.basename(resolved) !== storageKey) throw new Error("Clave de almacenamiento inválida."); return resolved; }
export async function writeMediaFile(storageKey: string, content: Uint8Array) { await mkdir(mediaRoot, { recursive: true }); await writeFile(resolveStoragePath(storageKey), content); }
export async function readMediaFile(storageKey: string) { return readFile(resolveStoragePath(storageKey)); }
export async function removeMediaFile(storageKey: string) { try { await unlink(resolveStoragePath(storageKey)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; } }
