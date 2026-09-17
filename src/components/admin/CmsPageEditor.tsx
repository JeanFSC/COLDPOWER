"use client";

import { ArrowDown, ArrowUp, ChevronDown, FileText, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type ContentType = "PAGE" | "BANNER" | "LANDING" | "BLOCK";
type BlockType = "hero" | "banner" | "text" | "contact" | "links" | "promo";
type BlockStatus = "draft" | "published";
type LinkItem = { label: string; href: string };
type Block = {
  key: string;
  type: BlockType;
  order: number;
  status: BlockStatus;
  payload: Record<string, unknown>;
  fields: Record<string, string>;
  links: LinkItem[];
};
type CmsPageSummary = { slug: string; title: string };

const blockLabels: Record<BlockType, string> = {
  hero: "Hero",
  banner: "Banner",
  text: "Texto",
  contact: "Contacto",
  links: "Enlaces",
  promo: "Promoción",
};
const contentTypeLabels: Record<ContentType, string> = {
  PAGE: "Página",
  BANNER: "Banner",
  LANDING: "Landing",
  BLOCK: "Bloque",
};
const fieldLabels: Record<string, string> = {
  title: "Título",
  subtitle: "Subtítulo",
  body: "Contenido",
  imageUrl: "URL de imagen",
  altText: "Texto alternativo",
  ctaLabel: "Texto del botón",
  ctaHref: "Destino del botón",
  phone: "Teléfono",
  whatsapp: "WhatsApp",
  email: "Correo",
  schedule: "Horario",
};

function textValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}
function linkValues(payload: Record<string, unknown>) {
  if (!Array.isArray(payload.links)) return [];
  return payload.links.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const value = item as Record<string, unknown>;
    return [
      {
        label: typeof value.label === "string" ? value.label : "",
        href: typeof value.href === "string" ? value.href : "",
      },
    ];
  });
}
function fieldsFor(type: BlockType, payload: Record<string, unknown>) {
  const names =
    type === "hero" || type === "banner"
      ? ["title", "subtitle", "imageUrl", "altText", "ctaLabel", "ctaHref"]
      : type === "text" || type === "promo"
        ? ["title", "body"]
        : type === "contact"
          ? ["title", "phone", "whatsapp", "email", "schedule"]
          : ["title"];
  return Object.fromEntries(names.map((name) => [name, textValue(payload, name)]));
}
function formatDate(value: unknown) {
  if (!value) return "Sin fecha";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Sin fecha" : date.toLocaleString("es-PE");
}
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
function toBlock(block: {
  blockKey: string;
  type: BlockType;
  sortOrder: number;
  status: "DRAFT" | "PUBLISHED";
  payload: Record<string, unknown>;
}): Block {
  return {
    key: block.blockKey,
    type: block.type,
    order: block.sortOrder,
    status: block.status === "PUBLISHED" ? "published" : "draft",
    payload: block.payload,
    fields: fieldsFor(block.type, block.payload),
    links: linkValues(block.payload),
  };
}
function payloadFor(block: Block) {
  const payload = { ...block.payload };
  for (const [key, value] of Object.entries(block.fields)) {
    if (value.trim()) payload[key] = value.trim();
    else delete payload[key];
  }
  if (block.type === "links") {
    const links = block.links
      .map((item) => ({ label: item.label.trim(), href: item.href.trim() }))
      .filter((item) => item.label && item.href);
    if (links.length) payload.links = links;
    else delete payload.links;
  }
  return payload;
}

export function CmsPageEditor({ pages: pageOptions = [] }: { pages?: CmsPageSummary[] }) {
  const fallbackSlugs: CmsPageSummary[] = [
    { slug: "home", title: "home" },
    { slug: "nosotros", title: "nosotros" },
    { slug: "contacto", title: "contacto" },
    { slug: "footer", title: "footer" },
  ];
  const slugOptions = pageOptions.length ? pageOptions : fallbackSlugs;
  const [slug, setSlug] = useState(slugOptions[0]?.slug ?? "home");
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<ContentType>("PAGE");
  const [pageStatus, setPageStatus] = useState("DRAFT");
  const [scheduleAt, setScheduleAt] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");
  const [busy, setBusy] = useState(false);
  const [loadedAt, setLoadedAt] = useState<unknown>(null);
  async function load(nextSlug: string) {
    const response = await fetch(`/api/admin/cms/${nextSlug}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessageKind("error");
      setMessage(readApiError(result, "No se pudo cargar el contenido editorial."));
      return;
    }
    const data = result as {
      cms?: {
        page?: {
          title?: string;
          contentType?: ContentType;
          status?: string;
          scheduledAt?: string | null;
          updatedAt?: string;
        };
        blocks?: Array<{
          blockKey: string;
          type: BlockType;
          sortOrder: number;
          status: "DRAFT" | "PUBLISHED";
          payload: Record<string, unknown>;
        }> | null;
      } | null;
    };
    setTitle(data.cms?.page?.title ?? "");
    setContentType(data.cms?.page?.contentType ?? "PAGE");
    setPageStatus(data.cms?.page?.status ?? "DRAFT");
    setScheduleAt(
      data.cms?.page?.scheduledAt
        ? new Date(data.cms.page.scheduledAt).toISOString().slice(0, 16)
        : "",
    );
    setBlocks((data.cms?.blocks ?? []).map(toBlock).sort((a, b) => a.order - b.order));
    setLoadedAt(data.cms?.page?.updatedAt ?? null);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(slug);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [slug]);
  function addBlock() {
    const order = blocks.length;
    setBlocks((current) => [
      ...current,
      {
        key: `bloque-${order + 1}`,
        type: "text",
        order,
        status: "draft",
        payload: {},
        fields: { title: "", body: "" },
        links: [],
      },
    ]);
  }
  function updateBlock(index: number, patch: Partial<Block>) {
    setBlocks((current) =>
      current.map((block, currentIndex) =>
        currentIndex === index ? { ...block, ...patch } : block,
      ),
    );
  }
  function changeType(index: number, type: BlockType) {
    const block = blocks[index];
    if (block) updateBlock(index, { type, fields: fieldsFor(type, block.payload) });
  }
  function removeBlock(index: number) {
    setBlocks((current) =>
      current
        .filter((_, currentIndex) => currentIndex !== index)
        .map((item, order) => ({ ...item, order })),
    );
  }
  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, order) => ({ ...item, order }));
    });
  }
  function updateField(index: number, key: string, value: string) {
    setBlocks((current) =>
      current.map((block, currentIndex) =>
        currentIndex === index ? { ...block, fields: { ...block.fields, [key]: value } } : block,
      ),
    );
  }
  function updateLink(blockIndex: number, linkIndex: number, key: keyof LinkItem, value: string) {
    setBlocks((current) =>
      current.map((block, currentIndex) =>
        currentIndex === blockIndex
          ? {
              ...block,
              links: block.links.map((item, currentLinkIndex) =>
                currentLinkIndex === linkIndex ? { ...item, [key]: value } : item,
              ),
            }
          : block,
      ),
    );
  }
  function addLink(blockIndex: number) {
    setBlocks((current) =>
      current.map((block, currentIndex) =>
        currentIndex === blockIndex
          ? { ...block, links: [...block.links, { label: "", href: "" }] }
          : block,
      ),
    );
  }
  function removeLink(blockIndex: number, linkIndex: number) {
    setBlocks((current) =>
      current.map((block, currentIndex) =>
        currentIndex === blockIndex
          ? {
              ...block,
              links: block.links.filter((_, currentLinkIndex) => currentLinkIndex !== linkIndex),
            }
          : block,
      ),
    );
  }
  async function save(status: "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED") {
    setBusy(true);
    setMessage("");
    setMessageKind("success");
    try {
      if (status === "SCHEDULED" && !scheduleAt)
        throw new Error("Indica cuándo debe publicarse la página.");
      const nextBlocks = blocks.map((block) => ({
        key: block.key,
        type: block.type,
        order: block.order,
        status: block.status,
        payload: payloadFor(block),
      }));
      const response = await fetch(`/api/admin/cms/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          contentType,
          status,
          scheduleAt: status === "SCHEDULED" ? new Date(scheduleAt).toISOString() : undefined,
          blocks: nextBlocks,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(result, "No se pudo guardar."));
      setMessage(
        status === "PUBLISHED"
          ? "Contenido publicado."
          : status === "SCHEDULED"
            ? "Publicación programada."
            : status === "ARCHIVED"
              ? "Contenido archivado."
              : "Borrador guardado.",
      );
      await load(slug);
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "Error al guardar el CMS.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
            Editor visual de bloques
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
            Contenido administrable
          </h1>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Edita bloques con campos estructurados. El contenido publicado es el único visible en la
            web.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/admin/cms/${slug}/preview`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Previsualizar datos
          </a>
          <button
            type="button"
            onClick={() => void save("DRAFT")}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Guardar borrador
          </button>
          <button
            type="button"
            onClick={() => void save("PUBLISHED")}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Publicar
          </button>
          <button
            type="button"
            onClick={() => void save("ARCHIVED")}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            Archivar
          </button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)_150px_240px]">
        <label className="grid gap-1 text-[11px] font-semibold text-slate-500">
          Página
          <div className="relative">
            <select
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm font-medium text-slate-900 outline-none focus:border-blue-400"
            >
              {slugOptions.map((page) => (
                <option key={page.slug} value={page.slug}>
                  {page.title || page.slug}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </label>
        <label className="grid gap-1 text-[11px] font-semibold text-slate-500">
          Título interno
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-400"
            placeholder="Sin título editorial"
          />
        </label>
        <label className="grid gap-1 text-[11px] font-semibold text-slate-500">
          Tipo de contenido
          <select
            value={contentType}
            onChange={(event) => setContentType(event.target.value as ContentType)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-400"
          >
            {Object.entries(contentTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-1">
          <label htmlFor="cms-schedule" className="text-[11px] font-semibold text-slate-500">
            Programar publicación
          </label>
          <div className="flex gap-2">
            <input
              id="cms-schedule"
              type="datetime-local"
              value={scheduleAt}
              onChange={(event) => setScheduleAt(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={() => void save("SCHEDULED")}
              disabled={busy || !scheduleAt}
              className="rounded-lg border border-blue-200 px-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
            >
              Programar
            </button>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] font-medium text-slate-400">
        Estado: {pageStatus} · Última actualización: {formatDate(loadedAt)}
      </p>
      <div className="mt-5 grid gap-3">
        {!blocks.length ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-5 py-10 text-center text-xs font-semibold text-slate-400">
            <FileText className="mx-auto mb-2 h-5 w-5 text-slate-300" aria-hidden="true" />
            Esta página todavía no tiene bloques.
          </div>
        ) : null}
        {blocks.map((block, index) => (
          <article
            key={`${block.key}-${index}`}
            className="rounded-lg border border-slate-200 bg-slate-50/60 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-[auto_1fr_160px_120px_auto]">
              <div className="flex items-end gap-1 pb-0.5">
                <button
                  type="button"
                  onClick={() => moveBlock(index, -1)}
                  disabled={index === 0}
                  aria-label="Subir bloque"
                  className="inline-flex h-9 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(index, 1)}
                  disabled={index === blocks.length - 1}
                  aria-label="Bajar bloque"
                  className="inline-flex h-9 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Clave
                <input
                  aria-label="Clave del bloque"
                  value={block.key}
                  onChange={(event) => updateBlock(index, { key: event.target.value })}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-blue-400"
                />
              </label>
              <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Tipo
                <select
                  aria-label="Tipo del bloque"
                  value={block.type}
                  onChange={(event) => changeType(index, event.target.value as BlockType)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-400"
                >
                  {Object.entries(blockLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Estado
                <select
                  aria-label="Estado del bloque"
                  value={block.status}
                  onChange={(event) =>
                    updateBlock(index, { status: event.target.value as BlockStatus })
                  }
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-400"
                >
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => removeBlock(index)}
                className="inline-flex h-9 items-center justify-center gap-1 self-end rounded-lg px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Quitar
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(block.fields).map(([key, value]) => (
                <label
                  key={key}
                  className={`grid gap-1 text-[11px] font-semibold text-slate-500 ${key === "body" ? "sm:col-span-2" : ""}`}
                >
                  {fieldLabels[key] ?? key}
                  {key === "body" ? (
                    <textarea
                      value={value}
                      onChange={(event) => updateField(index, key, event.target.value)}
                      rows={5}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                    />
                  ) : (
                    <input
                      value={value}
                      onChange={(event) => updateField(index, key, event.target.value)}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-blue-400"
                    />
                  )}
                </label>
              ))}
            </div>
            {block.type === "links" ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900">Enlaces del bloque</p>
                  <button
                    type="button"
                    onClick={() => addLink(index)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Agregar enlace
                  </button>
                </div>
                <div className="mt-3 grid gap-2">
                  {block.links.map((item, linkIndex) => (
                    <div
                      key={`${index}-${linkIndex}`}
                      className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <input
                        aria-label={`Etiqueta del enlace ${linkIndex + 1}`}
                        value={item.label}
                        onChange={(event) =>
                          updateLink(index, linkIndex, "label", event.target.value)
                        }
                        placeholder="Etiqueta"
                        className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm outline-none focus:border-blue-400"
                      />
                      <input
                        aria-label={`Destino del enlace ${linkIndex + 1}`}
                        value={item.href}
                        onChange={(event) =>
                          updateLink(index, linkIndex, "href", event.target.value)
                        }
                        placeholder="/ruta-o-url"
                        className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm outline-none focus:border-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => removeLink(index, linkIndex)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
                {!block.links.length ? (
                  <p className="mt-2 text-xs text-slate-400">No hay enlaces agregados.</p>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
      <button
        type="button"
        onClick={addBlock}
        className="mt-4 inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Agregar bloque
      </button>
      {message ? (
        <p
          className={`mt-3 text-xs font-medium ${messageKind === "error" ? "text-rose-600" : "text-slate-500"}`}
          role={messageKind === "error" ? "alert" : "status"}
          aria-live={messageKind === "error" ? "assertive" : "polite"}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
