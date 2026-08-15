"use client";

import { useEffect, useState } from "react";

const pages = ["home", "nosotros", "contacto", "footer"] as const;
type PageSlug = (typeof pages)[number];
type BlockType = "hero" | "banner" | "text" | "contact" | "links" | "promo";
type Block = { key: string; type: BlockType; order: number; status: "draft" | "published"; payload: Record<string, unknown> };

function formatPayload(payload: Record<string, unknown>) { return JSON.stringify(payload, null, 2); }
function readApiError(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
    if (typeof error === "object" && error !== null && "message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return fallback;
}

export function CmsPageEditor() {
  const [slug, setSlug] = useState<PageSlug>("home");
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [payloadDrafts, setPayloadDrafts] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");
  const [busy, setBusy] = useState(false);

  async function load(nextSlug: PageSlug) {
    const response = await fetch(`/api/admin/cms/${nextSlug}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessageKind("error");
      setMessage(readApiError(result, "No se pudo cargar el contenido editorial."));
      return;
    }
    const data = result as { cms?: { page?: { title?: string }; blocks?: Array<{ blockKey: string; type: BlockType; sortOrder: number; status: "DRAFT" | "PUBLISHED"; payload: Record<string, unknown> }> | null } | null };
    const nextBlocks: Block[] = (data.cms?.blocks ?? []).map((block) => ({ key: block.blockKey, type: block.type, order: block.sortOrder, status: block.status === "PUBLISHED" ? "published" : "draft", payload: block.payload }));
    setTitle(data.cms?.page?.title ?? "");
    setBlocks(nextBlocks);
    setPayloadDrafts(Object.fromEntries(nextBlocks.map((block, index) => [index, formatPayload(block.payload)])));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(slug); }, 0);
    return () => window.clearTimeout(timer);
  }, [slug]);

  function addBlock() { const order = blocks.length; const block: Block = { key: `bloque-${order + 1}`, type: "text", order, status: "draft", payload: {} }; setBlocks([...blocks, block]); setPayloadDrafts({ ...payloadDrafts, [order]: "{}" }); }
  function updateBlock(index: number, patch: Partial<Block>) { setBlocks(blocks.map((block, current) => current === index ? { ...block, ...patch } : block)); }
  function removeBlock(index: number) { const nextBlocks = blocks.filter((_, current) => current !== index).map((item, order) => ({ ...item, order })); setBlocks(nextBlocks); setPayloadDrafts(Object.fromEntries(nextBlocks.map((block, current) => [current, formatPayload(block.payload)]))); }
  function parsePayloads() { return blocks.map((block, index) => { const parsed = JSON.parse(payloadDrafts[index] ?? formatPayload(block.payload)) as unknown; if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`El payload de ${block.key} debe ser un objeto JSON.`); return { ...block, payload: parsed as Record<string, unknown> }; }); }
  async function save(status: "DRAFT" | "PUBLISHED") {
    setBusy(true); setMessage(""); setMessageKind("success");
    try {
      const nextBlocks = parsePayloads();
      const response = await fetch(`/api/admin/cms/${slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, status, blocks: nextBlocks }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(result, "No se pudo guardar."));
      setMessage(status === "PUBLISHED" ? "Publicado" : "Borrador guardado");
      await load(slug);
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "Error al guardar el CMS.");
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-6 rounded-md border border-border bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">CMS</p><h1 className="mt-1 font-display text-2xl font-black text-dark">Contenido administrable</h1><p className="mt-2 text-sm text-gray-text">Edita el payload de cada bloque. Solo el contenido publicado se muestra en la web.</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => void save("DRAFT")} disabled={busy} className="rounded-md border border-border px-3 py-2 text-xs font-bold text-dark disabled:opacity-50">Guardar borrador</button><button type="button" onClick={() => void save("PUBLISHED")} disabled={busy} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Publicar</button></div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[180px_1fr]"><label className="grid gap-1 text-xs font-bold text-gray-text">Sección<select value={slug} onChange={(event) => setSlug(event.target.value as PageSlug)} className="h-10 rounded-md border border-border bg-white px-2 text-sm font-normal text-dark">{pages.map((page) => <option key={page} value={page}>{page}</option>)}</select></label><label className="grid gap-1 text-xs font-bold text-gray-text">Título interno<input value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 rounded-md border border-border px-2 text-sm font-normal text-dark" placeholder="Sin título editorial" /></label></div>
      <div className="mt-5 grid gap-3">{blocks.map((block, index) => <article key={`${block.key}-${index}`} className="rounded-md border border-border bg-background p-4"><div className="grid gap-3 sm:grid-cols-[1fr_160px_100px_auto]"><input aria-label="Clave del bloque" value={block.key} onChange={(event) => updateBlock(index, { key: event.target.value })} className="h-9 rounded-md border border-border bg-white px-2 text-sm" /><select aria-label="Tipo del bloque" value={block.type} onChange={(event) => updateBlock(index, { type: event.target.value as BlockType })} className="h-9 rounded-md border border-border bg-white px-2 text-xs"><option value="hero">Hero</option><option value="banner">Banner</option><option value="text">Texto</option><option value="contact">Contacto</option><option value="links">Enlaces</option><option value="promo">Promoción</option></select><select aria-label="Estado del bloque" value={block.status} onChange={(event) => updateBlock(index, { status: event.target.value as Block["status"] })} className="h-9 rounded-md border border-border bg-white px-2 text-xs"><option value="draft">Borrador</option><option value="published">Publicado</option></select><button type="button" onClick={() => removeBlock(index)} className="text-xs font-bold text-danger">Quitar</button></div><label className="mt-3 grid gap-1 text-xs font-bold text-gray-text">Contenido JSON<textarea aria-label={`Contenido JSON de ${block.key}`} value={payloadDrafts[index] ?? formatPayload(block.payload)} onChange={(event) => setPayloadDrafts({ ...payloadDrafts, [index]: event.target.value })} rows={6} spellCheck={false} className="rounded-md border border-border bg-white px-3 py-2 font-mono text-xs text-dark" placeholder={'{\n  "title": "Texto confirmado"\n}'} /></label></article>)}</div>
      <button type="button" onClick={addBlock} className="mt-4 rounded-md border border-primary px-3 py-2 text-xs font-bold text-primary">Agregar bloque</button>
      {message ? <p className="mt-3 text-xs text-gray-text" role={messageKind === "error" ? "alert" : "status"} aria-live={messageKind === "error" ? "assertive" : "polite"}>{message}</p> : null}
    </section>
  );
}
