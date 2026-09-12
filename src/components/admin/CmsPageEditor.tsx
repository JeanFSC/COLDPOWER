"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const pages = ["home", "nosotros", "contacto", "footer"] as const;
type PageSlug = (typeof pages)[number];
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

export function CmsPageEditor() {
  const [slug, setSlug] = useState<PageSlug>("home");
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<ContentType>("PAGE");
  const [pageStatus, setPageStatus] = useState("DRAFT");
  const [scheduleAt, setScheduleAt] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");
  const [busy, setBusy] = useState(false);
  const [loadedAt, setLoadedAt] = useState<unknown>(null);
  async function load(nextSlug: PageSlug) {
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
    setBlocks((data.cms?.blocks ?? []).map(toBlock));
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
    <section className="mt-6 rounded-md border border-border bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">CMS</p>
          <h1 className="mt-1 font-display text-2xl font-black text-dark">
            Contenido administrable
          </h1>
          <p className="mt-2 text-sm text-gray-text">
            Edita bloques con campos estructurados. El contenido publicado es el único visible en la
            web.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/admin/cms/${slug}/preview`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-border px-3 py-2 text-xs font-bold text-dark"
          >
            Previsualizar datos
          </a>
          <button
            type="button"
            onClick={() => void save("DRAFT")}
            disabled={busy}
            className="rounded-md border border-border px-3 py-2 text-xs font-bold text-dark disabled:opacity-50"
          >
            Guardar borrador
          </button>
          <button
            type="button"
            onClick={() => void save("PUBLISHED")}
            disabled={busy}
            className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            Publicar
          </button>
          <button
            type="button"
            onClick={() => void save("ARCHIVED")}
            disabled={busy}
            className="rounded-md border border-danger px-3 py-2 text-xs font-bold text-danger disabled:opacity-50"
          >
            Archivar
          </button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)_140px_220px]">
        <label className="grid gap-1 text-xs font-bold text-gray-text">
          Sección
          <select
            value={slug}
            onChange={(event) => setSlug(event.target.value as PageSlug)}
            className="h-10 rounded-md border border-border bg-white px-2 text-sm font-normal text-dark"
          >
            {pages.map((page) => (
              <option key={page} value={page}>
                {page}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-gray-text">
          Título interno
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-10 rounded-md border border-border bg-white px-2 text-sm font-normal text-dark"
            placeholder="Sin título editorial"
          />
        </label>
        <label className="grid gap-1 text-xs font-bold text-gray-text">
          Tipo de contenido
          <select
            value={contentType}
            onChange={(event) => setContentType(event.target.value as ContentType)}
            className="h-10 rounded-md border border-border bg-white px-2 text-sm font-normal text-dark"
          >
            {Object.entries(contentTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-1">
          <label htmlFor="cms-schedule" className="text-xs font-bold text-gray-text">
            Programar publicación
          </label>
          <div className="flex gap-2">
            <input
              id="cms-schedule"
              type="datetime-local"
              value={scheduleAt}
              onChange={(event) => setScheduleAt(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-md border border-border bg-white px-2 text-sm font-normal text-dark"
            />
            <button
              type="button"
              onClick={() => void save("SCHEDULED")}
              disabled={busy || !scheduleAt}
              className="rounded-md border border-primary px-2 text-[10px] font-bold text-primary disabled:opacity-50"
            >
              Programar
            </button>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-gray-text">
        Estado: {pageStatus} · Última actualización: {formatDate(loadedAt)}
      </p>
      <div className="mt-5 grid gap-3">
        {blocks.map((block, index) => (
          <article
            key={`${block.key}-${index}`}
            className="rounded-md border border-border bg-background p-4"
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_160px_120px_auto]">
              <label className="grid gap-1 text-[10px] font-bold text-gray-text">
                Clave
                <input
                  aria-label="Clave del bloque"
                  value={block.key}
                  onChange={(event) => updateBlock(index, { key: event.target.value })}
                  className="h-9 rounded-md border border-border bg-white px-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-[10px] font-bold text-gray-text">
                Tipo
                <select
                  aria-label="Tipo del bloque"
                  value={block.type}
                  onChange={(event) => changeType(index, event.target.value as BlockType)}
                  className="h-9 rounded-md border border-border bg-white px-2 text-xs"
                >
                  {Object.entries(blockLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-[10px] font-bold text-gray-text">
                Estado
                <select
                  aria-label="Estado del bloque"
                  value={block.status}
                  onChange={(event) =>
                    updateBlock(index, { status: event.target.value as BlockStatus })
                  }
                  className="h-9 rounded-md border border-border bg-white px-2 text-xs"
                >
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => removeBlock(index)}
                className="inline-flex h-9 items-center justify-center gap-1 self-end text-xs font-bold text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Quitar
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(block.fields).map(([key, value]) => (
                <label
                  key={key}
                  className={`grid gap-1 text-xs font-bold text-gray-text ${key === "body" ? "sm:col-span-2" : ""}`}
                >
                  {fieldLabels[key] ?? key}
                  {key === "body" ? (
                    <textarea
                      value={value}
                      onChange={(event) => updateField(index, key, event.target.value)}
                      rows={5}
                      className="rounded-md border border-border bg-white px-3 py-2 text-sm font-normal text-dark"
                    />
                  ) : (
                    <input
                      value={value}
                      onChange={(event) => updateField(index, key, event.target.value)}
                      className="h-9 rounded-md border border-border bg-white px-2 text-sm font-normal text-dark"
                    />
                  )}
                </label>
              ))}
            </div>
            {block.type === "links" ? (
              <div className="mt-4 rounded-md border border-border bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-dark">Enlaces del bloque</p>
                  <button
                    type="button"
                    onClick={() => addLink(index)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary"
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
                        className="h-9 rounded-md border border-border px-2 text-sm"
                      />
                      <input
                        aria-label={`Destino del enlace ${linkIndex + 1}`}
                        value={item.href}
                        onChange={(event) =>
                          updateLink(index, linkIndex, "href", event.target.value)
                        }
                        placeholder="/ruta-o-url"
                        className="h-9 rounded-md border border-border px-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeLink(index, linkIndex)}
                        className="text-xs font-bold text-danger"
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
                {!block.links.length ? (
                  <p className="mt-2 text-xs text-gray-text">No hay enlaces agregados.</p>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
      <button
        type="button"
        onClick={addBlock}
        className="mt-4 inline-flex items-center gap-1 rounded-md border border-primary px-3 py-2 text-xs font-bold text-primary"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Agregar bloque
      </button>
      {message ? (
        <p
          className="mt-3 text-xs text-gray-text"
          role={messageKind === "error" ? "alert" : "status"}
          aria-live={messageKind === "error" ? "assertive" : "polite"}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
