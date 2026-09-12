export const cmsPageSlugs = ["home", "nosotros", "contacto", "footer"] as const;
export type CmsPageSlug = (typeof cmsPageSlugs)[number];
export const cmsBlockTypes = ["hero", "banner", "text", "contact", "links", "promo"] as const;
export type CmsBlockType = (typeof cmsBlockTypes)[number];
export const cmsStatuses = ["draft", "published"] as const;
export type CmsStatus = (typeof cmsStatuses)[number];
export const cmsPageStatuses = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;
export type CmsPageStatus = (typeof cmsPageStatuses)[number];
export const cmsContentTypes = ["PAGE", "BANNER", "LANDING", "BLOCK"] as const;
export type CmsContentType = (typeof cmsContentTypes)[number];
export type CmsBlockInput = {
  key: string;
  type: CmsBlockType;
  order: number;
  status?: CmsStatus;
  payload: Record<string, unknown>;
};
export type ValidatedCmsBlock = CmsBlockInput & { status: CmsStatus };
type CmsValidationResult = { ok: true; blocks: ValidatedCmsBlock[] } | { ok: false; error: string };
export function validateCmsPageSlug(value: unknown): CmsPageSlug | null {
  return typeof value === "string" && (cmsPageSlugs as readonly string[]).includes(value)
    ? (value as CmsPageSlug)
    : null;
}
export function isValidCmsSlug(value: unknown): value is CmsPageSlug {
  return validateCmsPageSlug(value) !== null;
}
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
export function validateCmsBlocks(input: unknown): CmsValidationResult {
  if (!Array.isArray(input) || input.length > 20)
    return { ok: false, error: "La página CMS debe tener entre 0 y 20 bloques." };
  const orders = new Set<number>();
  const keys = new Set<string>();
  const blocks: ValidatedCmsBlock[] = [];
  for (const item of input) {
    if (!isPlainObject(item)) return { ok: false, error: "Bloque CMS inválido." };
    const key = typeof item.key === "string" ? item.key.trim() : "";
    const type = item.type;
    const order = item.order;
    const status = item.status ?? "draft";
    if (!/^[a-z0-9][a-z0-9_-]{0,80}$/.test(key) || keys.has(key))
      return { ok: false, error: "Clave de bloque inválida o repetida." };
    if (typeof type !== "string" || !(cmsBlockTypes as readonly string[]).includes(type))
      return { ok: false, error: "Tipo de bloque CMS inválido." };
    if (typeof order !== "number" || !Number.isInteger(order) || order < 0 || orders.has(order))
      return { ok: false, error: "Orden de bloque inválido o repetido." };
    if (typeof status !== "string" || !(cmsStatuses as readonly string[]).includes(status))
      return { ok: false, error: "Estado CMS inválido." };
    if (!isPlainObject(item.payload))
      return { ok: false, error: "El payload CMS debe ser un objeto." };
    if (JSON.stringify(item.payload).length > 20000)
      return { ok: false, error: "Payload CMS demasiado grande." };
    keys.add(key);
    orders.add(order);
    blocks.push({
      key,
      type: type as CmsBlockType,
      order,
      status: status as CmsStatus,
      payload: item.payload,
    });
  }
  return { ok: true, blocks: blocks.sort((a, b) => a.order - b.order) };
}

export function collectCmsMediaIds(value: unknown): string[] {
  const found = new Set<string>();
  function visit(node: unknown) {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      if (/^(media|asset)(Id|Ids)$/i.test(key)) {
        if (typeof child === "string" && child.trim()) found.add(child.trim());
        if (Array.isArray(child))
          child
            .filter((item): item is string => typeof item === "string")
            .forEach((item) => found.add(item.trim()));
      }
      visit(child);
    }
  }
  visit(value);
  return [...found];
}
