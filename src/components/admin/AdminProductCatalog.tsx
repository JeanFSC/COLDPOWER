"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  ArrowDownAZ,
  ArrowDownRight,
  ArrowUpAZ,
  ArrowUpRight,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Copy,
  Edit3,
  ExternalLink,
  Filter,
  Image as ImageIcon,
  Info,
  Layers3,
  MoreHorizontal,
  Package,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  Tag,
  UsersRound,
  X,
} from "lucide-react";
import type { CatalogQuality, CatalogQualityLevel } from "@/lib/catalog-quality";
import type { PublicationStatus } from "@/lib/catalog-admin-contract";
import { resolveProductImage } from "@/lib/product-image";
import { ProductCreateForm } from "@/components/admin/ProductCreateForm";
import { CatalogImportDialog } from "@/components/admin/CatalogImportDialog";
import { DuplicateDecisionControl } from "@/components/admin/DuplicateDecisionControl";
import { AdminSparkline } from "@/components/admin/AdminChartsLazy";

const panel =
  "min-w-0 rounded-[14px] border border-[#e2eaf1] bg-white shadow-[0_1px_3px_rgba(16,42,67,0.035)]";

type Option = {
  id: string;
  name: string;
  slug?: string;
  categoryId?: string;
  productCount?: number;
};
type DuplicateCandidate = {
  id: string;
  sku: string;
  name: string;
  originalName: string;
  brand: string | null;
  category: string;
  reference: string | null;
};
type DuplicateReviewGroup = { group: string; products: DuplicateCandidate[] };
type Stock = {
  state: "AVAILABLE" | "LOW" | "ZERO" | "UNKNOWN";
  available: number | null;
  onHand: number | null;
  reserved: number | null;
  minimum: number | null;
  locations: number;
};
type Media = {
  primaryUrl: string;
  altText: string | null;
  assetId: string;
  galleryCount: number;
} | null;
export type AdminCatalogItem = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  normalizedName: string;
  originalName: string;
  commercialName: string | null;
  featured: boolean;
  productType: string;
  category: string;
  categoryId: string;
  categorySlug: string;
  family: string;
  familyId: string;
  familySlug: string;
  brand: string | null;
  brandId: string | null;
  publicationStatus: PublicationStatus;
  publicationStatusLabel: string;
  editorialWorkflowState: string;
  requiresReview: boolean | null;
  reviewReason: string | null;
  possibleDuplicate: boolean | null;
  duplicateGroup: string | null;
  duplicateDecision: string;
  canonicalProductId: string | null;
  normalizationConfidence: string | null;
  sourceStatus: string;
  sourcePage: number | null;
  sourceRow: number | null;
  editorialDescription: string | null;
  currentRetailPrice: { amount: number; currency: string } | null;
  stock: Stock;
  media: Media;
  quality: CatalogQuality;
  updatedAt: string | Date;
};

export type CatalogSummary = {
  categories: Array<{ id: string; name: string; count: number; percentage: number }>;
  brands: Array<{ id: string; name: string; count: number; percentage: number }>;
  quality: {
    averageScore: number;
    good: number;
    acceptable: number;
    poor: number;
    goodPercentage: number;
    acceptablePercentage: number;
    poorPercentage: number;
  };
  alerts: {
    requiresReview: number;
    pendingDuplicates: number;
    missingPrimaryImage: number;
    missingBrand: number;
    insufficientDescription: number;
    missingRetailPrice: number;
    unknownStock: number;
  };
};

export type CatalogMetrics = {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  reviewProducts: number;
  duplicateProducts: number;
  productsRequiringReview: number;
  totalBrands: number;
};
type CatalogMetricTrend = { points: number[]; previousValue: number | null; periodDays: number };

type Detail = {
  sourceIdentity: {
    sku: string;
    originalName: string;
    normalizedName: string;
    categoryId: string;
    familyId: string;
    brandId: string | null;
    sourceStatus: string;
    sourcePage: number | null;
    sourceRow: number | null;
  };
  editorialData: {
    commercialName: string | null;
    editorialDescription: string | null;
    featured: boolean;
  };
  technicalData: Record<string, string | string[] | null>;
  taxonomy: {
    category: Option;
    family: Option;
    brand: Option | null;
    editorial: { categoryId: string | null; familyId: string | null; brandId: string | null };
  };
  publication: {
    status: PublicationStatus;
    statusLabel: string;
    workflowState: string;
    requiresReview: boolean | null;
    reviewReason: string | null;
  };
  duplicateInformation: {
    possibleDuplicate: boolean | null;
    duplicateGroup: string | null;
    decision: string;
    canonicalProductId: string | null;
  };
  stockSummary: Stock;
  media: Array<{
    primaryUrl: string;
    altText: string | null;
    assetId: string;
    slot: string;
    sortOrder: number;
  }>;
  pricing: Array<{
    id: string;
    priceType: string;
    amount: string;
    currency: string;
    status: string;
    active: boolean;
    validFrom: string | Date;
    validUntil: string | Date | null;
  }> | null;
  priceHistory: Array<{
    id: string;
    priceType: string;
    previousAmount: string | null;
    newAmount: string;
    currency: string;
    reason: string | null;
    createdAt: string | Date;
  }> | null;
  auditHistory: Array<{
    id: string;
    action: string;
    actorId: string | null;
    createdAt: string | Date;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  }>;
};

export type AdminProductCatalogProps = {
  items: AdminCatalogItem[];
  total: number;
  pagination: { page: number; totalPages: number; totalItems: number; pageSize: number };
  queryString: string;
  facets: {
    categories: Option[];
    families: Option[];
    brands: Option[];
    publicationStatuses: string[];
    sourceStatuses: string[];
    confidenceLevels: string[];
  };
  summary: CatalogSummary;
  fetchedAt: string;
  metrics: CatalogMetrics;
  metricTrends: Record<
    | "totalProducts"
    | "publishedProducts"
    | "reviewProducts"
    | "productsRequiringReview"
    | "duplicateProducts",
    CatalogMetricTrend
  >;
  duplicateGroups?: DuplicateReviewGroup[];
  createOptions?: { categories: Option[]; families: Option[]; brands: Option[] };
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canPublish: boolean;
    canReview: boolean;
    canPricing: boolean;
    canInventory: boolean;
    canMedia: boolean;
    canArchive: boolean;
  };
};

const statusLabels: Record<string, string> = {
  published: "Publicado",
  review: "En revisión",
  draft: "Borrador",
  hidden: "Oculto",
  archived: "Archivado",
};
const statusTones: Record<string, string> = {
  published: "border-[#b8e6d1] bg-[#e8f8ef] text-[#13895a]",
  review: "border-[#f6d59c] bg-[#fff5e6] text-[#bd6b00]",
  draft: "border-[#dce6ee] bg-[#f5f8fa] text-[#647b91]",
  hidden: "border-[#cbd4dd] bg-[#eef1f4] text-[#455d73]",
  archived: "border-[#dce6ee] bg-[#f7f9fb] text-[#8296a9]",
};
const qualityTones: Record<CatalogQualityLevel, string> = {
  good: "border-[#b8e6d1] bg-[#e8f8ef] text-[#13895a]",
  acceptable: "border-[#f6d59c] bg-[#fff5e6] text-[#bd6b00]",
  poor: "border-[#ffd0d0] bg-[#fff0f0] text-[#d94848]",
};
const qualityLabels: Record<CatalogQualityLevel, string> = {
  good: "Buena",
  acceptable: "Aceptable",
  poor: "Baja",
};

function money(value: { amount: number; currency: string } | null) {
  if (!value) return null;
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: value.currency,
    minimumFractionDigits: 2,
  }).format(value.amount);
}
function dateTime(value: string | Date) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
function stockLabel(stock: Stock) {
  return {
    AVAILABLE: "Disponible",
    LOW: "Stock bajo",
    ZERO: "Sin stock",
    UNKNOWN: "Stock desconocido",
  }[stock.state];
}
function iconButton(label: string) {
  void label;
  return `inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#607894] transition hover:bg-[#f4f7fa] focus-visible:ring-2 focus-visible:ring-[#2277ee]`;
}

function StatusBadge({
  status,
  requiresReview,
}: {
  status: string;
  requiresReview?: boolean | null;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[9px] font-extrabold ${statusTones[status] ?? statusTones.draft}`}
    >
      {statusLabels[status] ?? "Estado editorial"}
      {requiresReview ? (
        <CircleAlert className="h-3 w-3 text-[#ed4b4b]" aria-label="Requiere revisión" />
      ) : null}
    </span>
  );
}

function QualityBadge({ quality }: { quality: CatalogQuality }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-[9px] font-extrabold ${qualityTones[quality.level]}`}
      title={`Calidad ${quality.score}/100. ${quality.missingFields.length ? `Falta: ${quality.missingFields.join(", ")}.` : "Ficha completa."}`}
    >
      {quality.score}%
    </span>
  );
}

function ProductThumbnail({
  item,
  size = 34,
}: {
  item: Pick<AdminCatalogItem, "name" | "media" | "family" | "category">;
  size?: number;
}) {
  const media = resolveProductImage({
    images: item.media?.primaryUrl ? [item.media.primaryUrl] : [],
    family: item.family,
    category: item.category,
  });
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f5f8fa]"
      style={{ width: size, height: size }}
      title={media.isReference ? "Imagen referencial" : undefined}
    >
      <Image
        src={media.src}
        alt={item.media?.altText || (media.isReference ? `Imagen referencial: ${item.name}` : item.name)}
        fill
        sizes={`${size}px`}
        className="object-contain p-1"
        unoptimized={media.src.startsWith("/api/")}
      />
      {media.isReference ? <span className="absolute inset-x-0 bottom-0 truncate bg-[#102a43]/85 px-0.5 text-center text-[7px] font-extrabold leading-3 text-white">Imagen referencial</span> : null}
    </span>
  );
}

function QualityDonut({ quality }: { quality: CatalogSummary["quality"] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = 86 * ratio;
    canvas.height = 86 * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    const total = Math.max(1, quality.good + quality.acceptable + quality.poor);
    const values = [
      [quality.good, "#22a66f"],
      [quality.acceptable, "#f59e0b"],
      [quality.poor, "#ef5350"],
    ] as const;
    let start = -Math.PI / 2;
    for (const [value, color] of values) {
      const end = start + (value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(43, 43, 33, start, end);
      ctx.strokeStyle = color;
      ctx.lineWidth = 10;
      ctx.stroke();
      start = end;
    }
    ctx.beginPath();
    ctx.arc(43, 43, 27, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }, [quality]);
  return (
    <canvas
      ref={ref}
      width={86}
      height={86}
      aria-label={`Calidad promedio ${quality.averageScore}%`}
      role="img"
      className="h-[86px] w-[86px]"
    />
  );
}

function buildHref(queryString: string, changes: Record<string, string | null>) {
  const next = new URLSearchParams(queryString);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  }
  if (Object.keys(changes).some((key) => key !== "page" && key !== "pageSize"))
    next.set("page", "1");
  const query = next.toString();
  return `/admin/catalogo${query ? `?${query}` : ""}`;
}

function SummarySection({
  title,
  items,
  onItemClick,
}: {
  title: string;
  items: CatalogSummary["categories"] | CatalogSummary["brands"];
  onItemClick: (id: string) => void;
}) {
  const top = items.slice(0, 5);
  return (
    <section className="border-t border-[#edf2f6] px-4 py-3.5 first:border-t-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-extrabold text-[#102a43]">{title}</h3>
        {items.length > 5 ? (
          <span className="text-[9px] font-extrabold text-[#2277ee]">Ver todas</span>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2">
        {top.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item.id)}
            className="flex items-center gap-2 text-left text-[9px] font-semibold text-[#526b84] hover:text-[#2277ee]"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${["bg-[#28a67c]", "bg-[#f2b134]", "bg-[#ff8b1f]", "bg-[#ed5353]", "bg-[#8057e8]"][index]}`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
            <b className="text-[#304b66]">{item.count.toLocaleString("es-PE")}</b>
            <span className="w-7 text-right text-[#8296a9]">{item.percentage}%</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-[#e9eef3]" aria-hidden="true">
        {top.map((item, index) => (
          <span
            key={item.id}
            className={
              ["bg-[#28a67c]", "bg-[#f2b134]", "bg-[#ff8b1f]", "bg-[#ed5353]", "bg-[#8057e8]"][
                index
              ]
            }
            style={{ width: `${Math.max(item.percentage, 1)}%` }}
          />
        ))}
      </div>
    </section>
  );
}

function CatalogSummaryRail({
  summary,
  queryString,
  onRefresh,
}: {
  summary: CatalogSummary;
  queryString: string;
  onRefresh: (href: string) => void;
}) {
  const alertItems = [
    [
      summary.alerts.requiresReview,
      "productos requieren revisión",
      "requiresReview=true",
      "text-[#ed5353]",
      ShieldAlert,
    ],
    [
      summary.alerts.pendingDuplicates,
      "duplicados editoriales pendientes",
      "possibleDuplicate=true&duplicateDecision=pending",
      "text-[#8057e8]",
      Copy,
    ],
    [
      summary.alerts.missingPrimaryImage,
      "sin imagen principal",
      "hasMedia=false",
      "text-[#f58b20]",
      ImageIcon,
    ],
    [
      summary.alerts.missingRetailPrice,
      "sin precio retail",
      "hasPrice=false",
      "text-[#2277ee]",
      CircleDollarSign,
    ],
  ] as const;
  return (
    <aside className="grid h-fit gap-3">
      <section className={panel}>
        <div className="flex items-center justify-between border-b border-[#edf2f6] px-4 py-3.5">
          <div>
            <h2 className="text-[12px] font-extrabold text-[#102a43]">Resumen del catálogo</h2>
            <p className="mt-1 text-[9px] font-semibold text-[#8296a9]">Actualizado ahora</p>
          </div>
          <Info
            className="h-3.5 w-3.5 text-[#8296a9]"
            aria-label="Agregados calculados en servidor"
          />
        </div>
        <SummarySection
          title="Por categorías"
          items={summary.categories}
          onItemClick={(id) => onRefresh(buildHref(queryString, { categoryId: id }))}
        />
        <SummarySection
          title="Por marcas"
          items={summary.brands}
          onItemClick={(id) =>
            onRefresh(
              id === "no-brand"
                ? buildHref(queryString, { brandId: null, hasBrand: "false" })
                : buildHref(queryString, { brandId: id }),
            )
          }
        />
      </section>
      <section className={panel}>
        <div className="flex items-center justify-between border-b border-[#edf2f6] px-4 py-3.5">
          <h2 className="text-[12px] font-extrabold text-[#102a43]">Calidad del catálogo</h2>
          <span className="text-[9px] font-extrabold text-[#2277ee]">Ver detalle</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="relative shrink-0">
            <QualityDonut quality={summary.quality} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <strong className="text-[16px] font-black text-[#102a43]">
                {summary.quality.averageScore}%
              </strong>
              <span className="text-[7px] font-semibold text-[#8296a9]">Calidad buena</span>
            </div>
          </div>
          <div className="grid flex-1 gap-2 text-[9px]">
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-[#22a66f]" />
              <span className="flex-1 text-[#526b84]">Buena</span>
              <b>{summary.quality.good.toLocaleString("es-PE")}</b>
              <small className="w-7 text-right text-[#8296a9]">
                {summary.quality.goodPercentage}%
              </small>
            </span>
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-[#f59e0b]" />
              <span className="flex-1 text-[#526b84]">Aceptable</span>
              <b>{summary.quality.acceptable.toLocaleString("es-PE")}</b>
              <small className="w-7 text-right text-[#8296a9]">
                {summary.quality.acceptablePercentage}%
              </small>
            </span>
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-[#ef5350]" />
              <span className="flex-1 text-[#526b84]">Baja</span>
              <b>{summary.quality.poor.toLocaleString("es-PE")}</b>
              <small className="w-7 text-right text-[#8296a9]">
                {summary.quality.poorPercentage}%
              </small>
            </span>
          </div>
        </div>
      </section>
      <section className={panel}>
        <div className="flex items-center justify-between border-b border-[#edf2f6] px-4 py-3.5">
          <h2 className="text-[12px] font-extrabold text-[#102a43]">Alertas activas</h2>
          <span className="text-[9px] font-extrabold text-[#2277ee]">Ver todas</span>
        </div>
        <div className="grid gap-3 px-4 py-3">
          {alertItems.map(([value, label, query, tone, Icon]) => (
            <button
              key={label}
              type="button"
              onClick={() =>
                onRefresh(
                  buildHref(
                    queryString,
                    Object.fromEntries(
                      query.split("&").map((entry) => entry.split("=") as [string, string]),
                    ),
                  ),
                )
              }
              className="flex items-center gap-2 text-left text-[9px] font-semibold text-[#526b84] hover:text-[#2277ee]"
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${tone}`} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              <b className={tone}>{value.toLocaleString("es-PE")}</b>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

function RowActionMenu({
  item,
  permissions,
  onOpen,
}: {
  item: AdminCatalogItem;
  permissions: AdminProductCatalogProps["permissions"];
  onOpen: () => void;
}) {
  return (
    <details className="relative">
      <summary
        className={`${iconButton("Más acciones")} list-none cursor-pointer`}
        aria-label={`Más acciones para ${item.name}`}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-[#dce6ee] bg-white p-1.5 shadow-[0_8px_24px_rgba(16,42,67,0.14)]">
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[10px] font-bold text-[#304b66] hover:bg-[#f4f7fa]"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Ver / editar
        </button>
        {permissions.canPricing ? (
          <Link
            href={`/admin/precios?productId=${encodeURIComponent(item.id)}`}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-bold text-[#304b66] hover:bg-[#f4f7fa]"
          >
            <CircleDollarSign className="h-3.5 w-3.5" />
            Gestionar precios
          </Link>
        ) : null}
        {permissions.canInventory ? (
          <Link
            href={`/admin/inventario?productId=${encodeURIComponent(item.id)}`}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-bold text-[#304b66] hover:bg-[#f4f7fa]"
          >
            <Boxes className="h-3.5 w-3.5" />
            Ver inventario
          </Link>
        ) : null}
        <Link
          href={`/admin/catalogo/${encodeURIComponent(item.id)}`}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-bold text-[#304b66] hover:bg-[#f4f7fa]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir análisis
        </Link>
      </div>
    </details>
  );
}

function ProductDetailDrawer({
  item,
  options,
  permissions,
  onClose,
  onSaved,
}: {
  item: AdminCatalogItem | null;
  options: { categories: Option[]; families: Option[]; brands: Option[] };
  permissions: AdminProductCatalogProps["permissions"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [tab, setTab] = useState("Información");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [mediaBusy, setMediaBusy] = useState(false);
  useEffect(() => {
    if (!item) return;
    // The effect both subscribes to the selected product and resets the local editor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetail(null);
    setMessage("");
    setTab("Información");
    const controller = new AbortController();
    fetch(`/api/admin/catalogo/${encodeURIComponent(item.id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || "No se pudo cargar la ficha.");
        return result.product as Detail;
      })
      .then((value) => {
        setDetail(value);
        setName(value.editorialData.commercialName ?? "");
        setDescription(value.editorialData.editorialDescription ?? "");
        setFeatured(value.editorialData.featured);
        setCategoryId(value.taxonomy.editorial.categoryId ?? "");
        setFamilyId(value.taxonomy.editorial.familyId ?? "");
        setBrandId(value.taxonomy.editorial.brandId ?? "");
      })
      .catch((error) => {
        if (error.name !== "AbortError")
          setMessage(error instanceof Error ? error.message : "No se pudo cargar la ficha.");
      });
    return () => controller.abort();
  }, [item]);
  useEffect(() => {
    if (!item) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);
  if (!item) return null;
  const selectedProduct = item;
  const productId = item.id;
  const effectiveFamilies = options.families.filter(
    (family) => !categoryId || family.categoryId === categoryId,
  );
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/catalogo/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commercialName: name.trim() || null,
          editorialDescription: description.trim() || null,
          featured,
          editorialCategoryId: categoryId || null,
          editorialFamilyId: familyId || null,
          editorialBrandId: brandId || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "No se pudo guardar la ficha.");
      setMessage("Producto actualizado correctamente.");
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la ficha.");
    } finally {
      setBusy(false);
    }
  }
  async function uploadAndAssociate(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setMediaBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("altText", name.trim() || selectedProduct.name);
      const uploadResponse = await fetch("/api/admin/media", { method: "POST", body: form });
      const uploadResult = await uploadResponse.json() as { asset?: { id?: string; url?: string; altText?: string | null }; error?: string | { message?: string } };
      const uploadError = typeof uploadResult.error === "string" ? uploadResult.error : uploadResult.error?.message;
      if (!uploadResponse.ok || !uploadResult.asset?.id) throw new Error(uploadError || "No se pudo subir la imagen.");
      const associateResponse = await fetch(`/api/admin/catalogo/${encodeURIComponent(productId)}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetId: uploadResult.asset.id, slot: "primary", sortOrder: 0 }) });
      const associateResult = await associateResponse.json() as { error?: string | { message?: string } };
      const associateError = typeof associateResult.error === "string" ? associateResult.error : associateResult.error?.message;
      if (!associateResponse.ok) throw new Error(associateError || "No se pudo asociar la imagen.");
      setDetail((current) => current ? { ...current, media: [{ assetId: uploadResult.asset!.id!, primaryUrl: uploadResult.asset!.url || `/api/media/${uploadResult.asset!.id}`, altText: uploadResult.asset!.altText || name.trim() || selectedProduct.name, slot: "primary", sortOrder: 0 }, ...current.media.filter((asset) => asset.slot !== "primary")] } : current);
      setMessage("Imagen subida y asociada como principal.");
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    } finally {
      setMediaBusy(false);
    }
  }
  const detailTabs = [
    "Información",
    "Contenido",
    "Multimedia",
    "Comercial",
    "Inventario",
    "Historial",
  ];
  const technicalEntries = detail?.technicalData
    ? Object.entries(detail.technicalData).filter(
        ([, value]) => value !== null && value !== "" && !(Array.isArray(value) && !value.length),
      )
    : [];
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-[#102a43]/30"
        onClick={onClose}
        aria-label="Cerrar ficha del producto"
      />
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-[600px] flex-col border-l border-[#dce6ee] bg-white shadow-[-12px_0_36px_rgba(16,42,67,0.14)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
      >
        <div className="flex items-start gap-3 border-b border-[#edf2f6] px-5 py-4">
          <ProductThumbnail item={item} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="product-detail-title"
                className="truncate text-[16px] font-black tracking-[-0.02em] text-[#102a43]"
              >
                {item.name}
              </h2>
              <StatusBadge status={item.publicationStatus} requiresReview={item.requiresReview} />
            </div>
            <p className="mt-1 font-mono text-[10px] font-bold text-[#71869c]">{item.sku}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={iconButton("Cerrar")}
              onClick={onClose}
              aria-label="Cerrar ficha"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-[#edf2f6] px-4 pt-2">
          {detailTabs.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setTab(entry)}
              className={`whitespace-nowrap border-b-2 px-2.5 pb-2.5 text-[10px] font-extrabold ${tab === entry ? "border-[#2277ee] text-[#2277ee]" : "border-transparent text-[#71869c]"}`}
            >
              {entry}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!detail ? (
            <div className="grid gap-3">
              <div className="h-16 animate-pulse rounded-xl bg-[#f2f6f9]" />
              <div className="h-28 animate-pulse rounded-xl bg-[#f2f6f9]" />
            </div>
          ) : tab === "Información" ? (
            <div className="grid gap-5">
              <section>
                <SectionTitle
                  title="Identidad de origen"
                  hint="Estos datos provienen de la fuente original y no se editan desde el editor comercial."
                />
                <dl className="mt-3 grid gap-2 rounded-xl border border-[#edf2f6] bg-[#fbfcfd] p-3 text-[10px] sm:grid-cols-2">
                  <ReadOnly label="SKU" value={detail.sourceIdentity.sku} mono />
                  <ReadOnly label="Nombre original" value={detail.sourceIdentity.originalName} />
                  <ReadOnly
                    label="Nombre normalizado"
                    value={detail.sourceIdentity.normalizedName}
                  />
                  <ReadOnly label="Estado fuente" value={detail.sourceIdentity.sourceStatus} />
                  <ReadOnly
                    label="Página fuente"
                    value={detail.sourceIdentity.sourcePage ?? "Sin dato"}
                  />
                  <ReadOnly
                    label="Fila fuente"
                    value={detail.sourceIdentity.sourceRow ?? "Sin dato"}
                  />
                </dl>
              </section>
              <section>
                <SectionTitle title="Datos comerciales" />
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
                    Nombre comercial
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      disabled={!permissions.canEdit}
                      className="h-9 rounded-lg border border-[#dce6ee] px-3 text-[11px] font-semibold text-[#304b66] disabled:bg-[#f5f8fa]"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField
                      label="Categoría editorial"
                      value={categoryId}
                      onChange={(value) => {
                        setCategoryId(value);
                        if (!effectiveFamilies.some((family) => family.id === familyId))
                          setFamilyId("");
                      }}
                      options={options.categories}
                      disabled={!permissions.canEdit}
                      empty="Usar categoría fuente"
                    />
                    <SelectField
                      label="Familia editorial"
                      value={familyId}
                      onChange={setFamilyId}
                      options={effectiveFamilies}
                      disabled={!permissions.canEdit || !categoryId}
                      empty="Usar familia fuente"
                    />
                  </div>
                  <SelectField
                    label="Marca editorial"
                    value={brandId}
                    onChange={setBrandId}
                    options={options.brands}
                    disabled={!permissions.canEdit}
                    empty="Usar marca fuente"
                  />
                  <label className="flex items-center gap-2 text-[10px] font-extrabold text-[#526b84]">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(event) => setFeatured(event.target.checked)}
                      disabled={!permissions.canEdit}
                    />
                    Producto destacado
                  </label>
                </div>
              </section>
            </div>
          ) : tab === "Contenido" ? (
            <div className="grid gap-4">
              <section>
                <SectionTitle title="Descripción editorial" />
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={!permissions.canEdit}
                  rows={6}
                  maxLength={4000}
                  className="mt-3 w-full rounded-xl border border-[#dce6ee] px-3 py-2 text-[11px] leading-5 text-[#304b66] disabled:bg-[#f5f8fa]"
                />
                <p className="mt-1 text-right text-[9px] text-[#8296a9]">
                  {description.length}/4000
                </p>
              </section>
              <section>
                <SectionTitle title="Información técnica" />
                <dl className="mt-3 grid gap-2 rounded-xl border border-[#edf2f6] bg-[#fbfcfd] p-3 sm:grid-cols-2">
                  {technicalEntries.map(([key, value]) => (
                    <ReadOnly
                      key={key}
                      label={key}
                      value={Array.isArray(value) ? value.join(", ") : String(value)}
                    />
                  ))}
                  {!technicalEntries.length ? (
                    <p className="text-[10px] text-[#8296a9]">
                      No hay información técnica confirmada.
                    </p>
                  ) : null}
                </dl>
              </section>
            </div>
          ) : tab === "Multimedia" ? (
            <section className="grid gap-3">
              <SectionTitle
                title="Imagen principal y galería"
                hint="Los assets se administran desde Media Library. No se eliminan físicamente desde esta ficha."
              />
              {permissions.canMedia ? (
                <label className="grid gap-1 rounded-xl border border-[#cfe0f7] bg-[#f5f9ff] p-3 text-[10px] font-extrabold text-[#526b84]">
                  Subir y asociar imagen principal
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={mediaBusy} onChange={(event) => void uploadAndAssociate(event)} className="text-[10px] font-semibold text-[#526b84] disabled:opacity-50" />
                  <span className="font-normal text-[#8296a9]">Se guarda en la biblioteca, queda auditada y reemplaza el primary anterior.</span>
                </label>
              ) : <PermissionPanel allowed={false} message="No tienes permiso para subir media." />}
              <div className="grid gap-2 sm:grid-cols-2">
                {detail.media.map((asset) => (
                  <div
                    key={`${asset.assetId}-${asset.sortOrder}`}
                    className="flex items-center gap-3 rounded-xl border border-[#edf2f6] p-2"
                  >
                    <span className="relative h-12 w-12 overflow-hidden rounded-lg bg-[#f5f8fa]">
                      <Image
                        src={asset.primaryUrl}
                        alt={asset.altText || "Asset de producto"}
                        fill
                        sizes="48px"
                        className="object-contain p-1"
                        unoptimized={asset.primaryUrl.startsWith("/api/")}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-bold text-[#304b66]">
                        {asset.slot === "primary" ? "Imagen principal" : "Galería"}
                      </p>
                      <p className="truncate text-[9px] text-[#8296a9]">
                        {asset.altText || "Sin texto alternativo"}
                      </p>
                    </div>
                  </div>
                ))}
                {!detail.media.length ? (
                  <EmptyPanel
                    icon={ImageIcon}
                    title="Imagen pendiente"
                    description="No hay imágenes activas asociadas a esta ficha."
                  />
                ) : null}
              </div>
            </section>
          ) : tab === "Comercial" ? (
            <section className="grid gap-4">
              <SectionTitle title="Información comercial" />
              <PermissionPanel
                allowed={permissions.canPricing}
                message="No tienes permiso para ver precios."
              />
              {permissions.canPricing && detail.pricing?.some((price) => ["RETAIL", "WHOLESALE", "MINIMUM"].includes(price.priceType)) ? (
                <div className="grid gap-2">
                  {detail.pricing
                    .filter((price) => ["RETAIL", "WHOLESALE", "MINIMUM"].includes(price.priceType))
                    .map((price) => (
                      <div
                        key={price.id}
                        className="flex items-center justify-between rounded-xl border border-[#edf2f6] p-3"
                      >
                        <div>
                          <p className="text-[10px] font-extrabold text-[#526b84]">
                            {price.priceType === "RETAIL"
                              ? "Precio minorista"
                              : price.priceType === "WHOLESALE"
                                ? "Precio mayorista"
                                : "Precio mínimo"}
                          </p>
                          <p className="mt-1 text-[9px] text-[#8296a9]">
                            {price.active ? "Vigente" : "No activo"}
                          </p>
                        </div>
                        <b className="text-[13px] text-[#102a43]">
                          {new Intl.NumberFormat("es-PE", {
                            style: "currency",
                            currency: price.currency,
                          }).format(Number(price.amount))}
                        </b>
                      </div>
                    ))}
                </div>
              ) : permissions.canPricing ? (
                <EmptyPanel icon={CircleDollarSign} title="Sin precio comercial" description="No hay un precio comercial confirmado para esta ficha." />
              ) : null}
            </section>
          ) : tab === "Inventario" ? (
            <section className="grid gap-4">
              <SectionTitle
                title="Inventario agregado"
                hint="El disponible es físico menos reservado. Stock desconocido no se interpreta como cero."
              />
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatBox label="Físico" value={detail.stockSummary.onHand ?? "—"} />
                <StatBox label="Reservado" value={detail.stockSummary.reserved ?? "—"} />
                <StatBox label="Disponible" value={detail.stockSummary.available ?? "—"} />
                <StatBox label="Locales" value={detail.stockSummary.locations} />
              </dl>
              <div className="flex items-center justify-between rounded-xl border border-[#edf2f6] p-3">
                <span className="text-[10px] font-extrabold text-[#526b84]">Estado</span>
                <span className="text-[10px] font-black text-[#102a43]">
                  {stockLabel(detail.stockSummary)}
                </span>
              </div>
              {permissions.canInventory ? (
                <Link
                  href={`/admin/inventario?productId=${encodeURIComponent(item.id)}`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#102a43] px-4 text-[10px] font-extrabold text-white"
                >
                  Ver inventario <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </section>
          ) : (
            <section className="grid gap-3">
              <SectionTitle
                title="Historial de auditoría"
                hint="Eventos persistidos por las mutaciones del catálogo."
              />
              {detail.auditHistory.map((event) => (
                <div key={event.id} className="rounded-xl border border-[#edf2f6] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-extrabold text-[#304b66]">
                      {technicalAction(event.action)}
                    </p>
                    <time className="text-[9px] text-[#8296a9]">{dateTime(event.createdAt)}</time>
                  </div>
                  <p className="mt-1 font-mono text-[9px] text-[#8296a9]">
                    {event.actorId || "Sistema"}
                  </p>
                </div>
              ))}
              {!detail.auditHistory.length ? (
                <EmptyPanel
                  icon={ClipboardCheck}
                  title="Sin eventos"
                  description="Todavía no hay cambios auditados para este producto."
                />
              ) : null}
            </section>
          )}
        </div>
        <div className="border-t border-[#edf2f6] px-5 py-3">
          {message ? (
            <p
              className={`mb-2 rounded-lg border px-3 py-2 text-[10px] font-bold ${message.includes("correctamente") ? "border-[#b8e6d1] bg-[#e8f8ef] text-[#13895a]" : "border-[#ffd0d0] bg-[#fff0f0] text-[#d94848]"}`}
              role="status"
            >
              {message}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] text-[#8296a9]">
              {detail ? `Actualizado ${dateTime(item.updatedAt)}` : "Cargando ficha…"}
            </span>
            {permissions.canEdit && detail ? (
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#102a43] px-4 text-[10px] font-extrabold text-white disabled:opacity-50"
              >
                {busy ? "Guardando…" : "Guardar cambios"}
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h3 className="text-[11px] font-extrabold text-[#102a43]">{title}</h3>
      {hint ? <p className="mt-1 text-[9px] leading-4 text-[#8296a9]">{hint}</p> : null}
    </div>
  );
}
function ReadOnly({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[8px] font-extrabold uppercase tracking-[0.08em] text-[#8296a9]">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-[10px] font-semibold text-[#304b66] ${mono ? "font-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
  empty,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  empty: string;
}) {
  return (
    <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
      {label}
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="has-custom-chevron h-9 w-full appearance-none rounded-lg border border-[#dce6ee] bg-white px-3 pr-8 text-[10px] font-semibold text-[#304b66] disabled:bg-[#f5f8fa]"
        >
          <option value="">{empty}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8296a9]" />
      </span>
    </label>
  );
}
function StatBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#edf2f6] bg-[#fbfcfd] p-3">
      <p className="text-[8px] font-extrabold uppercase tracking-[0.08em] text-[#8296a9]">
        {label}
      </p>
      <strong className="mt-1 block text-[16px] font-black text-[#102a43]">{value}</strong>
    </div>
  );
}
function PermissionPanel({ allowed, message }: { allowed: boolean; message: string }) {
  return allowed ? null : (
    <div className="rounded-xl border border-[#dce6ee] bg-[#f7f9fb] p-4 text-[10px] font-semibold text-[#71869c]">
      {message}
    </div>
  );
}
function EmptyPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Package;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#dce6ee] bg-[#fbfcfd] px-4 py-8 text-center">
      <Icon className="mx-auto h-6 w-6 text-[#9db0c1]" />
      <p className="mt-2 text-[10px] font-extrabold text-[#304b66]">{title}</p>
      <p className="mt-1 text-[9px] text-[#8296a9]">{description}</p>
    </div>
  );
}
function technicalAction(action: string) {
  return (
    (
      {
        PRODUCT_EDITORIAL_UPDATED: "Actualizó información editorial",
        PRODUCT_PUBLICATION_CHANGED: "Cambió el estado editorial",
        PRODUCT_DUPLICATE_REVIEWED: "Revisó un posible duplicado",
        PRODUCT_CREATED: "Creó el producto",
      } as Record<string, string>
    )[action] ?? action
  );
}

function BulkWorkspace({
  selected,
  items,
  duplicateGroups = [],
  permissions,
  onBulk,
  onOpen,
}: {
  selected: AdminCatalogItem[];
  items: AdminCatalogItem[];
  duplicateGroups?: DuplicateReviewGroup[];
  permissions: AdminProductCatalogProps["permissions"];
  onBulk: (action: "publish" | "review" | "hide") => void;
  onOpen: (item: AdminCatalogItem) => void;
}) {
  const [tab, setTab] = useState("Operaciones masivas");
  const [operation, setOperation] = useState<
    | "category"
    | "brand"
    | "pricing"
    | "inventory"
    | "attributes"
    | "publish"
    | "review"
    | "hide"
    | null
  >(null);
  const tabs = [
    "Operaciones masivas",
    "Asignaciones",
    "Publicación",
    "Calidad de fichas",
    "Duplicados",
  ];
  const duplicates = items.filter((item) => item.possibleDuplicate);
  const selectedLabel =
    selected.length === 1
      ? "1 producto seleccionado"
      : `${selected.length} productos seleccionados`;
  const operationMeta = operation
    ? {
        category: {
          title: "Asignar categoría",
          description:
            "La categoría y su familia se gestionan en la ficha editorial para preservar la jerarquía categoría → familia.",
          cta: "Abrir primera ficha",
          tone: "blue",
        },
        brand: {
          title: "Asignar marca",
          description:
            "La marca se edita desde la ficha editorial; aún no existe un cambio masivo persistente para este campo.",
          cta: "Abrir primera ficha",
          tone: "blue",
        },
        pricing: {
          title: "Gestionar precios",
          description:
            "Los precios requieren su propio flujo de vigencia, validación y auditoría. Continúa en el espacio de precios.",
          cta: "Ir a precios",
          tone: "purple",
        },
        inventory: {
          title: "Gestionar inventario",
          description:
            "El stock se ajusta por local y deja Kardex. Nunca se altera desde el catálogo.",
          cta: "Ir a inventario",
          tone: "purple",
        },
        attributes: {
          title: "Editar atributos",
          description:
            "Edita el contenido comercial y atributos técnicos desde la ficha. La acción masiva aún no está disponible.",
          cta: "Abrir primera ficha",
          tone: "blue",
        },
        publish: {
          title: "Publicar seleccionados",
          description:
            "Se ejecutará un preflight de publicación real antes de permitir persistir cualquier cambio.",
          cta: "Revisar publicación",
          tone: "orange",
        },
        review: {
          title: "Enviar a revisión",
          description:
            "Marca las referencias seleccionadas para revisión editorial y registra la acción en auditoría.",
          cta: "Enviar a revisión",
          tone: "orange",
        },
        hide: {
          title: "Ocultar seleccionados",
          description:
            "Retira las referencias de la vista pública sin eliminarlas del catálogo ni del historial.",
          cta: "Ocultar productos",
          tone: "orange",
        },
      }[operation]
    : null;
  function continueOperation() {
    if (!operation || !selected.length) return;
    if (operation === "publish" || operation === "review" || operation === "hide") {
      onBulk(operation);
      return;
    }
    const first = selected[0];
    if (operation === "pricing") {
      window.location.assign(`/admin/precios?productId=${encodeURIComponent(first.id)}`);
      return;
    }
    if (operation === "inventory") {
      window.location.assign(`/admin/inventario?productId=${encodeURIComponent(first.id)}`);
      return;
    }
    onOpen(first);
  }
  return (
    <section className={`${panel} overflow-hidden`}>
      <div className="flex gap-5 overflow-x-auto border-b border-[#edf2f6] px-5 pt-1">
        {tabs.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setTab(entry)}
            className={`whitespace-nowrap border-b-2 py-3 text-[10px] font-extrabold ${tab === entry ? "border-[#2277ee] text-[#2277ee]" : "border-transparent text-[#526b84]"}`}
          >
            {entry}
          </button>
        ))}
      </div>
      {tab === "Operaciones masivas" ? (
        <div className="grid gap-3 p-4 xl:grid-cols-12">
          <div className="rounded-xl border border-[#edf2f6] bg-[#fbfcfd] p-4 xl:col-span-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black text-[#102a43]">1. Productos seleccionados</p>
              <span className="rounded-full bg-[#e8f1ff] px-2 py-1 text-[8px] font-black text-[#2277ee]">
                {selected.length}
              </span>
            </div>
            <p className="mt-2 text-[9px] leading-4 text-[#8296a9]">
              Elige los productos sobre los que deseas realizar acciones masivas.
            </p>
            <div className="mt-5 rounded-xl bg-[#f5f8fa] px-3 py-4 text-center">
              <p className="text-[9px] text-[#8296a9]">Productos seleccionados</p>
              <strong className="mt-1 block text-[28px] font-black text-[#102a43]">
                {selected.length}
              </strong>
              <p className="text-[9px] text-[#8296a9]">
                {selected.length ? "Listos para revisar" : "Ninguno seleccionado"}
              </p>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-[#e5edf3] bg-white">
              {selected.length ? (
                selected.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpen(item)}
                    className="flex w-full items-center gap-2 border-b border-[#edf2f6] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#f7fbff]"
                  >
                    <ProductThumbnail item={item} size={28} />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[9px] text-[#304b66]">{item.name}</b>
                      <small className="block truncate font-mono text-[8px] text-[#8296a9]">
                        {item.sku} · {item.category}
                      </small>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-[#9aabba]" aria-hidden="true" />
                  </button>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-[9px] text-[#8296a9]">
                  Selecciona productos desde la tabla para comenzar.
                </p>
              )}
            </div>
            {selected.length > 5 ? (
              <p className="mt-2 text-center text-[9px] font-semibold text-[#2277ee]">
                Ver los {selected.length} productos seleccionados
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border border-[#edf2f6] p-4 xl:col-span-3">
            <p className="text-[10px] font-black text-[#102a43]">2. Elige la acción</p>
            <p className="mt-1 text-[9px] leading-4 text-[#8296a9]">
              Las acciones se habilitan según tu rol y la selección actual.
            </p>
            <div className="mt-3 grid gap-2">
              <BulkAction
                icon={Tag}
                label="Editar categoría desde ficha"
                description="No disponible en lote; usa la ficha editorial"
                disabled
                active={operation === "category"}
                onClick={() => setOperation("category")}
              />
              <BulkAction
                icon={UsersRound}
                label="Asignar marca"
                description="No disponible en lote; usa la ficha editorial"
                disabled
                active={operation === "brand"}
                onClick={() => setOperation("brand")}
              />
              <BulkAction
                icon={CircleDollarSign}
                label="Actualizar precios"
                description="Gestionar precios en lote"
                disabled={!permissions.canPricing || !selected.length}
                active={operation === "pricing"}
                onClick={() => setOperation("pricing")}
              />
              <BulkAction
                icon={Boxes}
                label="Actualizar stock"
                description="Actualizar inventario en lote"
                disabled={!permissions.canInventory || !selected.length}
                active={operation === "inventory"}
                onClick={() => setOperation("inventory")}
              />
              <BulkAction
                icon={Edit3}
                label="Editar atributos"
                description="No disponible en lote; usa la ficha editorial"
                disabled
                active={operation === "attributes"}
                onClick={() => setOperation("attributes")}
              />
              {permissions.canPublish ? (
                <BulkAction
                  icon={Send}
                  label="Cambiar publicación"
                  description="Publicar, ocultar o revisar"
                  disabled={!selected.length}
                  active={operation === "publish" || operation === "hide"}
                  onClick={() => setOperation("publish")}
                />
              ) : null}
            </div>
          </div>
          <div className="rounded-xl border border-[#edf2f6] p-4 xl:col-span-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black text-[#102a43]">
                3. Configura y revisa el impacto
              </p>
              {operationMeta ? (
                <span className="text-[8px] font-black text-[#2277ee]">{selectedLabel}</span>
              ) : null}
            </div>
            <p className="mt-2 text-[9px] leading-4 text-[#8296a9]">
              Define los nuevos valores a aplicar.
            </p>
            <div className="mt-6 grid gap-3">
              <div
                className={`rounded-xl border p-4 text-[9px] ${operationMeta ? "border-[#cfe0f7] bg-[#f5f9ff] text-[#526b84]" : "border-dashed border-[#dce6ee] text-center text-[#8296a9]"}`}
              >
                {operationMeta ? (
                  <div className="text-left">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f1ff] text-[#2277ee]">
                        <Info className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <b className="text-[11px] text-[#102a43]">{operationMeta.title}</b>
                        <p className="mt-1 leading-4 text-[#71869c]">{operationMeta.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-[#dce8f5] pt-3">
                      <p className="font-extrabold uppercase tracking-[0.08em] text-[#8296a9]">
                        Impacto previsto
                      </p>
                      <p className="mt-1 leading-4 text-[#526b84]">
                        {operation === "publish"
                          ? "La validación previa identificará referencias elegibles y bloqueadas antes de publicar."
                          : operation === "review"
                            ? "Las referencias seleccionadas pasarán a revisión editorial y quedarán auditadas."
                            : "No se aplicará ningún cambio hasta continuar en el flujo correspondiente."}
                      </p>
                    </div>
                  </div>
                ) : null}
                {operationMeta
                  ? "Revisa el alcance antes de continuar."
                  : "Selecciona una acción para ver su configuración."}
              </div>
              <button
                type="button"
                disabled={!operation}
                onClick={continueOperation}
                className="h-9 rounded-lg bg-[#2277ee] text-[10px] font-extrabold text-white shadow-[0_5px_12px_rgba(34,119,238,0.18)] disabled:cursor-not-allowed disabled:bg-[#eef1f4] disabled:text-[#a2b0bd]"
              >
                {operationMeta?.cta ?? "Previsualizar cambios"}
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-[#edf2f6] p-4 xl:col-span-12">
            <p className="text-[10px] font-black text-[#102a43]">Acciones de publicación</p>
            <p className="mt-2 text-[9px] leading-4 text-[#8296a9]">
              Las publicaciones requieren preflight real antes de persistir.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {permissions.canPublish ? (
                <button
                  type="button"
                  onClick={() => setOperation("publish")}
                  disabled={!selected.length}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#ff830e] text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                  Revisar publicación
                </button>
              ) : null}
              {permissions.canReview ? (
                <button
                  type="button"
                  onClick={() => setOperation("review")}
                  disabled={!selected.length}
                  className="h-9 rounded-lg border border-[#dce6ee] px-3 text-[10px] font-extrabold text-[#526b84] disabled:opacity-40"
                >
                  Enviar a revisión
                </button>
              ) : null}
              {permissions.canPublish ? (
                <button
                  type="button"
                  onClick={() => setOperation("hide")}
                  disabled={!selected.length}
                  className="h-9 rounded-lg border border-[#dce6ee] px-3 text-[10px] font-extrabold text-[#526b84] disabled:opacity-40"
                >
                  Ocultar productos
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : tab === "Asignaciones" ? (
        <div className="grid gap-3 p-5">
          <SectionTitle
            title="Asignaciones editoriales"
            hint="Categoría, familia y marca se aplican con preview y respetan la dependencia categoría → familia."
          />
          <EmptyPanel
            icon={Layers3}
            title="Selecciona una acción de asignación"
            description="Las acciones se activan cuando existe una selección y un permiso de edición."
          />
        </div>
      ) : tab === "Publicación" ? (
        <div className="grid gap-4 p-5">
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Seleccionados" value={selected.length} />
            <StatBox
              label="Listos"
              value={
                selected.filter((item) => !item.requiresReview && !item.possibleDuplicate).length
              }
            />
            <StatBox
              label="Bloqueados"
              value={
                selected.filter((item) => item.requiresReview || item.possibleDuplicate).length
              }
            />
          </div>
          <p className="text-[10px] leading-5 text-[#71869c]">
            El servicio de publicación es la autoridad para evaluar blockers. La interfaz nunca
            publica directamente sin preflight.
          </p>
        </div>
      ) : tab === "Calidad de fichas" ? (
        <div className="grid gap-2 p-5">
          {(selected.length ? [...selected] : [...items])
            .sort((a, b) => a.quality.score - b.quality.score)
            .slice(0, 8)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpen(item)}
                className="flex items-center gap-3 rounded-xl border border-[#edf2f6] p-3 text-left hover:border-[#b8cde0]"
              >
                <ProductThumbnail item={item} size={30} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[10px] text-[#304b66]">{item.name}</b>
                  <small className="mt-1 block truncate text-[9px] text-[#8296a9]">
                    {item.quality.missingFields.slice(0, 3).join(", ") || "Ficha completa"}
                  </small>
                </span>
                <QualityBadge quality={item.quality} />
              </button>
            ))}
          {!items.length ? (
            <EmptyPanel
              icon={ClipboardCheck}
              title="Sin fichas"
              description="No hay productos disponibles para revisar."
            />
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 p-5">
          <DuplicateGroupsPanel groups={duplicateGroups} items={items} onOpen={onOpen} />
          {duplicates.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item)}
              className="flex items-center gap-3 rounded-xl border border-[#edf2f6] p-3 text-left"
            >
              <Copy className="h-4 w-4 text-[#8057e8]" />
              <span className="min-w-0 flex-1">
                <b className="block text-[10px] text-[#304b66]">{item.name}</b>
                <small className="font-mono text-[9px] text-[#8296a9]">
                  {item.sku} · {item.duplicateGroup || "Grupo pendiente"}
                </small>
              </span>
              <span className="text-[9px] font-extrabold text-[#8057e8]">
                {item.duplicateDecision === "pending" ? "Pendiente" : item.duplicateDecision}
              </span>
            </button>
          ))}
          {!duplicates.length && !duplicateGroups.length ? (
            <EmptyPanel
              icon={Copy}
              title="Sin duplicados editoriales pendientes"
              description="No existen grupos pendientes en el catálogo persistente."
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
function DuplicateGroupsPanel({
  groups,
  items,
  onOpen,
}: {
  groups: DuplicateReviewGroup[];
  items: AdminCatalogItem[];
  onOpen: (item: AdminCatalogItem) => void;
}) {
  const [review, setReview] = useState<{
    product: DuplicateCandidate;
    group: DuplicateReviewGroup;
  } | null>(null);
  const router = useRouter();
  if (!groups.length)
    return (
      <EmptyPanel
        icon={Copy}
        title="Sin duplicados editoriales pendientes"
        description="No existen grupos pendientes en el catálogo persistente."
      />
    );
  return (
    <>
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle
            title="Grupos pendientes"
            hint="Comparte referencias reales de la base persistente; abre una fila para comparar y decidir."
          />
          <span className="rounded-md bg-[#f2eaff] px-2 py-1 text-[9px] font-extrabold text-[#8057e8]">
            {groups.length} grupos
          </span>
        </div>
        {groups.slice(0, 8).map((group) => (
          <section
            key={group.group}
            className="rounded-xl border border-[#eadfff] bg-[#fcfaff] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Copy className="h-4 w-4 shrink-0 text-[#8057e8]" />
                <b className="truncate text-[10px] text-[#304b66]">{group.group}</b>
              </div>
              <span className="text-[9px] font-extrabold text-[#8057e8]">
                {group.products.length} referencias
              </span>
            </div>
            <div className="mt-2 grid gap-1.5">
              {group.products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setReview({ product, group })}
                  className="flex items-center gap-2 rounded-lg border border-[#f0e9ff] bg-white px-2.5 py-2 text-left hover:border-[#cbb7f5]"
                >
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[10px] text-[#304b66]">
                      {product.name || product.originalName}
                    </b>
                    <small className="font-mono text-[9px] text-[#8296a9]">
                      {product.sku} · {product.brand || "Sin marca"} · {product.category}
                    </small>
                  </span>
                  <span className="text-[9px] font-extrabold text-[#8057e8]">Revisar</span>
                </button>
              ))}
            </div>
          </section>
        ))}
        {groups.length > 8 ? (
          <p className="text-[9px] font-semibold text-[#8296a9]">
            Mostrando 8 de {groups.length} grupos. Usa el filtro de duplicados para revisar el
            resto.
          </p>
        ) : null}
      </div>
      {review ? (
        <DuplicateReviewModal
          product={review.product}
          group={review.group}
          currentItem={items.find((item) => item.id === review.product.id)}
          onOpen={onOpen}
          onClose={() => setReview(null)}
          onSaved={() => {
            setReview(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
function DuplicateReviewModal({
  product,
  group,
  currentItem,
  onOpen,
  onClose,
  onSaved,
}: {
  product: DuplicateCandidate;
  group: DuplicateReviewGroup;
  currentItem?: AdminCatalogItem;
  onOpen: (item: AdminCatalogItem) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const comparisons = group.products.filter((candidate) => candidate.id !== product.id).slice(0, 3);
  const current = {
    sku: product.sku,
    name: product.name || product.originalName,
    brand: product.brand || "Sin marca",
    category: product.category,
    reference: product.reference || "Sin dato",
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#102a43]/35 p-4">
      <section
        className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#dce6ee] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-review-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#edf2f6] px-5 py-4">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8057e8]">
              {group.group}
            </p>
            <h2 id="duplicate-review-title" className="mt-1 text-[16px] font-black text-[#102a43]">
              Revisión de duplicado
            </h2>
            <p className="mt-1 text-[10px] font-semibold text-[#8296a9]">
              Compara identidad comercial antes de registrar una decisión editorial.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={iconButton("Cerrar")}
            aria-label="Cerrar revisión de duplicado"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {[current, ...comparisons].map((candidate, index) => (
            <div
              key={`${candidate.sku}-${index}`}
              className={`rounded-xl border p-3 ${index === 0 ? "border-[#cddff0] bg-[#f8fbff]" : "border-[#eadfff] bg-[#fcfaff]"}`}
            >
              <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#8296a9]">
                {index === 0 ? "Referencia seleccionada" : "Posible coincidencia"}
              </p>
              <dl className="mt-3 grid gap-2 text-[10px]">
                <ReadOnly label="SKU" value={candidate.sku} mono />
                <ReadOnly label="Nombre" value={candidate.name} />
                <ReadOnly label="Marca" value={candidate.brand} />
                <ReadOnly label="Categoría" value={candidate.category} />
                <ReadOnly label="Referencia" value={candidate.reference} />
              </dl>
            </div>
          ))}
        </div>
        <div className="border-t border-[#edf2f6] px-5 py-4">
          <p className="text-[10px] font-extrabold text-[#304b66]">Decisión editorial</p>
          <DuplicateDecisionControl
            productId={product.id}
            currentDecision="pending"
            currentCanonicalProductId={null}
            candidates={group.products.map((candidate) => ({
              id: candidate.id,
              sku: candidate.sku,
              name: candidate.name || candidate.originalName,
            }))}
            onSaved={onSaved}
          />
          {currentItem ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpen(currentItem);
              }}
              className="mt-2 h-9 rounded-lg border border-[#dce6ee] px-3 text-[10px] font-extrabold text-[#526b84]"
            >
              Abrir ficha comercial
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
function BulkAction({
  icon: Icon,
  label,
  description,
  disabled,
  active = false,
  onClick,
}: {
  icon: typeof Tag;
  label: string;
  description: string;
  disabled: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-lg border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2277ee]/30 disabled:cursor-not-allowed disabled:opacity-45 ${active ? "border-[#2277ee] bg-[#f2f7ff] shadow-[0_2px_7px_rgba(34,119,238,0.10)]" : "border-[#edf2f6] hover:border-[#bdd4ec] hover:bg-[#fbfdff]"}`}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8f1ff] text-[#2277ee]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[9px] text-[#304b66]">{label}</b>
        <small className="block truncate text-[8px] text-[#8296a9]">{description}</small>
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-[#8296a9]" />
    </button>
  );
}

function PublicationPreflight({
  data,
  onClose,
  onConfirm,
}: {
  data: {
    totalSelected: number;
    eligible: number;
    blocked: Array<{ sku: string; name: string; reasons: string[] }>;
  };
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102a43]/35 p-4">
      <section
        className="w-full max-w-xl rounded-[16px] border border-[#dce6ee] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publication-preflight-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#edf2f6] px-5 py-4">
          <div>
            <h2 id="publication-preflight-title" className="text-[16px] font-black text-[#102a43]">
              Revisar publicación
            </h2>
            <p className="mt-1 text-[10px] text-[#8296a9]">
              El governance real evalúa cada referencia antes de persistir el cambio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={iconButton("Cerrar")}
            aria-label="Cerrar revisión"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 p-5">
          <StatBox label="Seleccionados" value={data.totalSelected} />
          <StatBox label="Listos para publicar" value={data.eligible} />
          <StatBox label="Bloqueados" value={data.blocked.length} />
        </div>
        {data.blocked.length ? (
          <div className="max-h-64 overflow-y-auto border-t border-[#edf2f6] px-5 py-3">
            <p className="text-[10px] font-extrabold text-[#d94848]">Bloqueos reales</p>
            <div className="mt-2 grid gap-2">
              {data.blocked.map((row) => (
                <div
                  key={row.sku}
                  className="rounded-lg border border-[#ffd0d0] bg-[#fff8f8] p-2.5"
                >
                  <p className="text-[10px] font-extrabold text-[#304b66]">
                    {row.name}{" "}
                    <span className="font-mono text-[9px] text-[#8296a9]">· {row.sku}</span>
                  </p>
                  <p className="mt-1 text-[9px] leading-4 text-[#d94848]">
                    {row.reasons.join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-5 rounded-lg border border-[#b8e6d1] bg-[#e8f8ef] p-3 text-[10px] font-semibold text-[#13895a]">
            Todas las referencias seleccionadas están listas.
          </div>
        )}
        <div className="flex justify-end gap-2 border-t border-[#edf2f6] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-[#dce6ee] px-4 text-[10px] font-extrabold text-[#526b84]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!data.eligible || busy}
            onClick={() => {
              setBusy(true);
              onConfirm();
            }}
            className="h-9 rounded-lg bg-[#ff830e] px-4 text-[10px] font-extrabold text-white disabled:opacity-40"
          >
            {busy ? "Publicando…" : `Publicar ${data.eligible} productos`}
          </button>
        </div>
      </section>
    </div>
  );
}

export function AdminProductCatalog({
  items,
  pagination,
  queryString,
  facets,
  summary,
  fetchedAt,
  metrics,
  metricTrends,
  duplicateGroups,
  createOptions,
  permissions,
}: AdminProductCatalogProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [opened, setOpened] = useState<AdminCatalogItem | null>(null);
  const [preflight, setPreflight] = useState<PublicationPreflightProps["data"] | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [toast, setToast] = useState("");
  const [moreFilters, setMoreFilters] = useState(false);
  const [publishMenu, setPublishMenu] = useState(false);
  const [searchValue, setSearchValue] = useState(
    new URLSearchParams(queryString).get("query") ?? "",
  );
  const selected = items.filter((item) => selectedIds.includes(item.id));
  const allVisibleSelected =
    items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const params = useMemo(() => new URLSearchParams(queryString), [queryString]);
  // Keep the controlled search field aligned after server navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchValue(params.get("query") ?? "");
  }, [params]);
  function navigate(href: string) {
    router.push(href);
  }
  function setFilter(key: string, value: string) {
    navigate(buildHref(queryString, { [key]: value || null }));
  }
  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(buildHref(queryString, { query: searchValue.trim() || null }));
  }
  function toggleAll() {
    setSelectedIds(allVisibleSelected ? [] : items.map((item) => item.id));
  }
  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }
  async function requestBulk(action: "publish" | "review" | "hide") {
    if (!selectedIds.length) return;
    setBusyAction(true);
    setToast("");
    try {
      if (action === "publish") {
        const response = await fetch("/api/admin/catalogo/bulk/preflight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds, action: "publish" }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error?.message || "No se pudo revisar la publicación.");
        setPreflight(result);
        return;
      }
      const response = await fetch("/api/admin/catalogo/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "No se pudo aplicar la acción.");
      setToast(result.message || "Cambios aplicados correctamente.");
      setSelectedIds([]);
      router.refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No se pudo aplicar la acción.");
    } finally {
      setBusyAction(false);
    }
  }
  async function confirmPublish() {
    if (!preflight?.eligible) return;
    setBusyAction(true);
    try {
      const response = await fetch("/api/admin/catalogo/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action: "publish" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "No se pudo publicar.");
      setToast(result.message || "Publicación completada.");
      setPreflight(null);
      setSelectedIds([]);
      router.refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No se pudo publicar.");
    } finally {
      setBusyAction(false);
    }
  }
  const paginationPages = Array.from(
    { length: Math.min(5, pagination.totalPages) },
    (_, index) => Math.max(1, Math.min(pagination.totalPages - 4, pagination.page - 2)) + index,
  ).filter((page) => page >= 1 && page <= pagination.totalPages);
  const activeChips: Array<[string, string, string]> = [];
  for (const [key, value] of params.entries()) {
    if (["page", "pageSize", "sort", "direction"].includes(key)) continue;
    const label =
      key === "publicationStatus"
        ? `Estado: ${statusLabels[value] ?? value}`
        : key === "requiresReview"
          ? "Requiere revisión"
          : key === "possibleDuplicate"
            ? "Posible duplicado"
            : key === "quality"
              ? `Calidad: ${qualityLabels[value as CatalogQualityLevel] ?? value}`
              : key === "query"
                ? `Buscar: ${value}`
                : `${key}: ${value}`;
    activeChips.push([key, value, label]);
  }
  const productOptions = createOptions ?? {
    categories: facets.categories,
    families: facets.families,
    brands: facets.brands,
  };
  const metricCards = [
    {
      label: "Total referencias",
      value: metrics.totalProducts,
      trend: metricTrends.totalProducts,
      improvement: "up",
      tone: "blue",
      Icon: CircleDollarSign,
      href: buildHref(queryString, {
        query: null,
        category: null,
        categoryId: null,
        family: null,
        familyId: null,
        brand: null,
        brandId: null,
        publicationStatus: null,
        requiresReview: null,
        possibleDuplicate: null,
        duplicateDecision: null,
        quality: null,
        page: "1",
      }),
    },
    {
      label: "Publicados",
      value: metrics.publishedProducts,
      trend: metricTrends.publishedProducts,
      improvement: "up",
      tone: "green",
      Icon: CircleCheck,
      href: buildHref(queryString, { publicationStatus: "published" }),
    },
    {
      label: "En revisión",
      value: metrics.reviewProducts,
      trend: metricTrends.reviewProducts,
      improvement: "down",
      tone: "orange",
      Icon: Clock3,
      href: buildHref(queryString, { publicationStatus: "review" }),
    },
    {
      label: "Requieren revisión",
      value: metrics.productsRequiringReview,
      trend: metricTrends.productsRequiringReview,
      improvement: "down",
      tone: "red",
      Icon: ShieldAlert,
      href: buildHref(queryString, { requiresReview: "true" }),
    },
    {
      label: "Duplicados editoriales pendientes",
      value: metrics.duplicateProducts,
      trend: metricTrends.duplicateProducts,
      improvement: "down",
      tone: "purple",
      Icon: Copy,
      href: buildHref(queryString, { possibleDuplicate: "true", duplicateDecision: "pending" }),
    },
  ] as const;
  return (
    <div className="space-y-4 pb-8">
      {toast ? (
        <div
          className="fixed right-4 top-20 z-[70] max-w-sm rounded-xl border border-[#b8e6d1] bg-[#e8f8ef] px-4 py-3 text-[10px] font-extrabold text-[#13895a] shadow-lg"
          role="status"
        >
          {toast}
          <button
            type="button"
            className="ml-3"
            onClick={() => setToast("")}
            aria-label="Cerrar aviso"
          >
            <X className="inline h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f1ff] text-[#2277ee]">
            <Package className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="break-words text-[23px] font-black tracking-[-0.04em] text-[#102a43] sm:text-[26px]">
              Gestión de productos
            </h1>
            <p className="mt-1 break-words text-[11px] font-semibold text-[#7d91a5]">
              Administra tu catálogo, calidad de fichas y publicación en todos los canales.
            </p>
          </div>
        </div>
        <div className="relative flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <ProductCreateForm
            categories={productOptions.categories}
            families={productOptions.families}
            brands={productOptions.brands}
            onCreated={async (id, sku) => {
              router.refresh();
              try {
                const response = await fetch(
                  `/api/admin/catalogo?query=${encodeURIComponent(sku)}&page=1&pageSize=1`,
                  { cache: "no-store" },
                );
                const result = (await response.json()) as { items?: AdminCatalogItem[] };
                const created = result.items?.find((item) => item.id === id);
                if (created) setOpened(created);
                else setToast("Producto creado correctamente. Actualizando catálogo…");
              } catch {
                setToast("Producto creado correctamente. Actualizando catálogo…");
              }
            }}
            canCreate={permissions.canCreate}
          />
          <CatalogImportDialog
            onCompleted={() => router.refresh()}
            canImport={permissions.canCreate}
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setPublishMenu((value) => !value)}
              disabled={!permissions.canPublish || busyAction}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#ff830e] px-3.5 text-[10px] font-extrabold text-white shadow-[0_5px_12px_rgba(255,131,14,0.16)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Send className="h-3.5 w-3.5" />
              Publicar cambios
              <ChevronDown
                className={`h-3.5 w-3.5 transition ${publishMenu ? "rotate-180" : ""}`}
              />
            </button>
            {publishMenu ? (
              <div className="absolute right-0 z-30 mt-1 w-56 rounded-xl border border-[#dce6ee] bg-white p-1.5 shadow-[0_8px_24px_rgba(16,42,67,0.14)]">
                <button
                  type="button"
                  onClick={() => {
                    setPublishMenu(false);
                    void requestBulk("publish");
                  }}
                  disabled={!selectedIds.length}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[10px] font-bold text-[#304b66] hover:bg-[#f4f7fa] disabled:opacity-40"
                >
                  Publicar productos seleccionados
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPublishMenu(false);
                    void requestBulk("review");
                  }}
                  disabled={!selectedIds.length}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[10px] font-bold text-[#304b66] hover:bg-[#f4f7fa] disabled:opacity-40"
                >
                  Enviar seleccionados a revisión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPublishMenu(false);
                    void requestBulk("hide");
                  }}
                  disabled={!selectedIds.length}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[10px] font-bold text-[#304b66] hover:bg-[#f4f7fa] disabled:opacity-40"
                >
                  Ocultar productos seleccionados
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map(({ label, value, trend, improvement, tone, Icon, href }) => {
          const previousValue = trend.previousValue;
          const difference = previousValue === null ? null : value - previousValue;
          const percentage =
            difference === null || previousValue === null || previousValue === 0
              ? null
              : Math.abs((difference / previousValue) * 100);
          const comparisonLabel =
            difference === null
              ? `Comparación disponible en ${trend.periodDays} días`
              : percentage === null
                ? `${difference > 0 ? "+" : ""}${difference.toLocaleString("es-PE")} vs. período anterior`
                : `${difference > 0 ? "+" : difference < 0 ? "−" : ""}${percentage.toLocaleString("es-PE", { maximumFractionDigits: 1 })}% vs. período anterior`;
          const changeIsGood =
            difference === null || difference === 0
              ? null
              : improvement === "up"
                ? difference > 0
                : difference < 0;
          const ComparisonIcon =
            difference === null || difference === 0
              ? null
              : difference > 0
                ? ArrowUpRight
                : ArrowDownRight;
          return (
            <Link
              key={label}
              href={href}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2277ee]/30 focus-visible:ring-offset-2"
            >
              <article
                className={`${panel} min-h-[172px] p-4 transition hover:-translate-y-0.5 hover:border-[#b9d2eb] hover:shadow-[0_8px_20px_rgba(16,42,67,0.08)] sm:p-5`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tone === "green" ? "bg-[#e4f7ef] text-[#159263]" : tone === "orange" ? "bg-[#fff0e0] text-[#f58b20]" : tone === "red" ? "bg-[#ffe8e8] text-[#ed4b4b]" : tone === "purple" ? "bg-[#eee9ff] text-[#8057e8]" : "bg-[#e8f1ff] text-[#2277ee]"}`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold leading-4 text-[#8195aa]">{label}</p>
                    <p className="mt-1 font-display text-[26px] font-black tracking-[-0.025em] text-[#102a43]">
                      {value.toLocaleString("es-PE")}
                    </p>
                    <p
                      className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold ${changeIsGood === null ? "text-[#8195aa]" : changeIsGood ? "text-[#159263]" : "text-[#ed4b4b]"}`}
                    >
                      {ComparisonIcon ? (
                        <ComparisonIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : null}
                      {comparisonLabel}
                    </p>
                  </div>
                </div>
                <AdminSparkline
                  tone={tone}
                  data={trend.points.length >= 2 ? trend.points : undefined}
                  ariaLabel={
                    trend.points.length >= 2
                      ? `Tendencia diaria de ${label.toLowerCase()}`
                      : `${label}: sin serie diaria disponible`
                  }
                  className="mt-3 block h-11 w-full"
                />
                {trend.points.length < 2 ? (
                  <p className="mt-1 text-[9px] font-semibold text-[#a5b6c5]">
                    Sin serie diaria disponible
                  </p>
                ) : null}
              </article>
            </Link>
          );
        })}
      </div>
      <div className={`${panel} p-3`}>
        <form
          onSubmit={onSearchSubmit}
          className="grid gap-x-3 gap-y-2 xl:grid-cols-[minmax(320px,2.8fr)_repeat(4,minmax(132px,1fr))]"
        >
          <label className="relative min-w-0 xl:self-end">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ca0b3]"
              aria-hidden="true"
            />
            <input
              name="query"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Buscar por SKU, nombre, marca o categoría…"
              className="h-9 w-full rounded-lg border border-[#dce6ee] pl-9 pr-9 text-[10px] font-semibold text-[#304b66] outline-none transition focus:border-[#2277ee] focus:ring-2 focus:ring-[#2277ee]/10"
            />
            <button
              type="submit"
              aria-label="Buscar productos"
              className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[#526b84] transition hover:bg-[#f2f7ff] hover:text-[#2277ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2277ee]/30"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </label>
          <FilterSelect
            label="Categoría"
            value={params.get("categoryId") || params.get("category") || ""}
            onChange={(value) => setFilter("categoryId", value)}
            options={facets.categories}
          />
          <FilterSelect
            label="Marca"
            value={params.get("brandId") || params.get("brand") || ""}
            onChange={(value) => setFilter("brandId", value)}
            options={facets.brands}
          />
          <FilterSelect
            label="Estado"
            value={params.get("publicationStatus") || ""}
            onChange={(value) => setFilter("publicationStatus", value)}
            options={Object.entries(statusLabels).map(([id, name]) => ({ id, name }))}
          />
          <FilterSelect
            label="Calidad"
            value={params.get("quality") || ""}
            onChange={(value) => setFilter("quality", value)}
            options={Object.entries(qualityLabels).map(([id, name]) => ({ id, name }))}
          />
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#edf2f6] pt-3">
          <button
            type="button"
            onClick={() => setMoreFilters((value) => !value)}
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#dce6ee] bg-[#fbfcfd] px-3 text-[10px] font-extrabold text-[#526b84] hover:border-[#cddff0] hover:text-[#2277ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2277ee]/30"
          >
            <Filter className="h-3.5 w-3.5" />
            Más filtros
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${moreFilters ? "rotate-180" : ""}`}
            />
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#edf2f6] bg-[#fbfcfd] px-3 text-[9px] font-semibold text-[#71869c]">
              <Clock3 className="h-3.5 w-3.5" />
              Actualizado: {dateTime(fetchedAt)}
            </span>
            <Link
              href="/admin/catalogo"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[10px] font-extrabold text-[#526b84] hover:bg-[#f3f8ff] hover:text-[#2277ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2277ee]/30"
            >
              Limpiar filtros
              <RefreshCw className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        {activeChips.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activeChips.map(([key, value, label]) => (
              <button
                type="button"
                key={`${key}-${value}`}
                onClick={() => navigate(buildHref(queryString, { [key]: null }))}
                className="inline-flex items-center gap-1 rounded-full border border-[#cddff0] bg-[#f3f8ff] px-2.5 py-1 text-[9px] font-bold text-[#2277ee]"
              >
                {label}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        ) : null}
        {moreFilters ? (
          <div className="mt-3 grid gap-2 border-t border-[#edf2f6] pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label="Familia"
              value={params.get("familyId") || params.get("family") || ""}
              onChange={(value) => setFilter("familyId", value)}
              options={facets.families}
            />
            <FilterSelect
              label="Requiere revisión"
              value={params.get("requiresReview") || ""}
              onChange={(value) => setFilter("requiresReview", value)}
              options={[
                { id: "true", name: "Sí" },
                { id: "false", name: "No" },
              ]}
            />
            <FilterSelect
              label="Duplicado"
              value={params.get("duplicateDecision") || ""}
              onChange={(value) => setFilter("duplicateDecision", value)}
              options={[
                { id: "pending", name: "Pendiente" },
                { id: "different", name: "Son diferentes" },
                { id: "confirmed", name: "Confirmado" },
                { id: "keep_both", name: "Mantener ambos" },
              ]}
            />
            <FilterSelect
              label="Confianza de normalización"
              value={params.get("confidence") || ""}
              onChange={(value) => setFilter("confidence", value)}
              options={facets.confidenceLevels.map((value) => ({ id: value, name: value }))}
            />
            <FilterSelect
              label="Estado fuente"
              value={params.get("sourceStatus") || ""}
              onChange={(value) => setFilter("sourceStatus", value)}
              options={facets.sourceStatuses.map((value) => ({ id: value, name: value }))}
            />
          </div>
        ) : null}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className={`${panel} min-w-0 overflow-hidden`}>
          <div className="flex flex-wrap items-center gap-2 border-b border-[#edf2f6] px-3 py-2.5">
            <label className="inline-flex items-center gap-2 text-[10px] font-semibold text-[#8296a9]">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAll}
                aria-label="Seleccionar productos visibles"
              />
              {selected.length ? `${selected.length} seleccionados` : "0 seleccionados"}
            </label>
            {selected.length ? (
              <>
                <button
                  type="button"
                  onClick={() => void requestBulk("publish")}
                  disabled={!permissions.canPublish || busyAction}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dce6ee] px-2.5 text-[9px] font-extrabold text-[#526b84] disabled:opacity-40"
                >
                  Acciones masivas
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!permissions.canReview}
                  onClick={() => void requestBulk("review")}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dce6ee] px-2.5 text-[9px] font-extrabold text-[#526b84] disabled:opacity-40"
                >
                  Enviar a revisión
                </button>
                <button
                  type="button"
                  disabled={!permissions.canPublish}
                  onClick={() => void requestBulk("hide")}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dce6ee] px-2.5 text-[9px] font-extrabold text-[#526b84] disabled:opacity-40"
                >
                  Más acciones
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </>
            ) : null}
            <span className="ml-auto">
              <Settings2 className="h-4 w-4 text-[#8296a9]" aria-label="Configurar columnas" />
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[930px] text-left">
              <thead className="border-b border-[#e9eff4] bg-[#fbfcfd] text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#7d91a5]">
                <tr>
                  <th className="w-9 px-3 py-3" />
                  <SortHeader label="SKU" sort="sku" queryString={queryString} />
                  <SortHeader label="Producto" sort="name" queryString={queryString} />
                  <SortHeader label="Categoría" sort="category" queryString={queryString} />
                  <SortHeader label="Marca" sort="brand" queryString={queryString} />
                  <SortHeader label="Estado" sort="status" queryString={queryString} />
                  <th className="px-3 py-3">Precio</th>
                  <th className="px-3 py-3">Stock</th>
                  <th className="px-3 py-3">Calidad</th>
                  <th className="w-12 px-3 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    onKeyDown={(event: KeyboardEvent<HTMLTableRowElement>) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setOpened(item);
                      }
                    }}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("button,input,a,summary")) return;
                      setOpened(item);
                    }}
                    className="cursor-pointer border-b border-[#f0f4f7] text-[10px] transition hover:bg-[#fbfdff] focus-within:bg-[#fbfdff] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2277ee]"
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggle(item.id)}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Seleccionar ${item.name}`}
                      />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="font-mono text-[9px] font-extrabold text-[#304b66]">
                        {item.sku}
                      </span>
                    </td>
                    <td className="max-w-[230px] px-3 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <ProductThumbnail item={item} />
                        <div className="min-w-0">
                          <b className="block truncate text-[10px] font-extrabold text-[#304b66]">
                            {item.name}
                          </b>
                          <span className="mt-1 block truncate text-[9px] text-[#8296a9]">
                            {item.family}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[9px] font-semibold text-[#526b84]">
                      {item.category}
                    </td>
                    <td className="px-3 py-3 text-[9px] font-semibold text-[#526b84]">
                      {item.brand || "Sin marca"}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge
                        status={item.publicationStatus}
                        requiresReview={item.requiresReview}
                      />
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#304b66]">
                      {money(item.currentRetailPrice) || (
                        <span className="rounded-md border border-[#dce6ee] bg-[#f7f9fb] px-2 py-1 text-[9px] font-extrabold text-[#71869c]">
                          Sin precio
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-semibold ${item.stock.state === "UNKNOWN" ? "text-[#8296a9]" : "text-[#304b66]"}`}
                        >
                          {item.stock.available ?? "—"}
                        </span>
                        <span
                          className={`hidden text-[8px] font-extrabold xl:inline ${item.stock.state === "AVAILABLE" ? "text-[#159263]" : "text-[#8296a9]"}`}
                        >
                          {stockLabel(item.stock)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <QualityBadge quality={item.quality} />
                    </td>
                    <td className="px-3 py-3">
                      <RowActionMenu
                        item={item}
                        permissions={permissions}
                        onOpen={() => setOpened(item)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length ? (
              <div className="p-4">
                <EmptyPanel
                  icon={Package}
                  title="No encontramos productos con estos filtros"
                  description="Prueba a limpiar uno o más filtros para volver a ver el catálogo."
                />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf2f6] px-4 py-3 text-[9px] font-semibold text-[#8296a9]">
            <span>
              Mostrando {items.length ? (pagination.page - 1) * pagination.pageSize + 1 : 0}–
              {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} de{" "}
              {pagination.totalItems.toLocaleString("es-PE")} productos
            </span>
            <div className="flex items-center gap-1">
              <Link
                href={buildHref(queryString, { page: String(Math.max(1, pagination.page - 1)) })}
                className={`${iconButton("Página anterior")} ${pagination.page <= 1 ? "pointer-events-none opacity-35" : ""}`}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
              {paginationPages.map((page) => (
                <Link
                  key={page}
                  href={buildHref(queryString, { page: String(page) })}
                  aria-current={page === pagination.page ? "page" : undefined}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-[9px] font-extrabold ${page === pagination.page ? "bg-[#2277ee] text-white" : "border border-[#dce6ee] text-[#526b84]"}`}
                >
                  {page}
                </Link>
              ))}
              <Link
                href={buildHref(queryString, {
                  page: String(Math.min(pagination.totalPages, pagination.page + 1)),
                })}
                className={`${iconButton("Página siguiente")} ${pagination.page >= pagination.totalPages ? "pointer-events-none opacity-35" : ""}`}
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <select
                value={String(pagination.pageSize)}
                onChange={(event) =>
                  navigate(buildHref(queryString, { pageSize: event.target.value, page: "1" }))
                }
                className="ml-2 h-7 rounded-md border border-[#dce6ee] bg-white px-2 text-[9px] font-extrabold text-[#526b84]"
                aria-label="Productos por página"
              >
                <option value="10">10 por página</option>
                <option value="25">25 por página</option>
                <option value="50">50 por página</option>
                <option value="100">100 por página</option>
              </select>
            </div>
          </div>
        </section>
        <CatalogSummaryRail summary={summary} queryString={queryString} onRefresh={navigate} />
      </div>
      <BulkWorkspace
        selected={selected}
        items={items}
        duplicateGroups={duplicateGroups}
        permissions={permissions}
        onBulk={(action) => void requestBulk(action)}
        onOpen={setOpened}
      />
      {opened ? (
        <ProductDetailDrawer
          item={opened}
          options={{
            categories: facets.categories,
            families: facets.families,
            brands: facets.brands,
          }}
          permissions={permissions}
          onClose={() => setOpened(null)}
          onSaved={() => {
            router.refresh();
          }}
        />
      ) : null}
      {preflight ? (
        <PublicationPreflight
          data={preflight}
          onClose={() => setPreflight(null)}
          onConfirm={() => void confirmPublish()}
        />
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <label className="relative grid min-w-0 gap-1 text-[8px] font-extrabold text-[#8296a9]">
      {label}
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="has-custom-chevron h-9 w-full appearance-none rounded-lg border border-[#dce6ee] bg-white px-2.5 pr-7 text-[10px] font-bold text-[#526b84]"
        >
          <option value="">Todos</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#8296a9]" />
      </span>
    </label>
  );
}
function SortHeader({
  label,
  sort,
  queryString,
}: {
  label: string;
  sort: "name" | "sku" | "category" | "brand" | "status";
  queryString: string;
}) {
  const params = new URLSearchParams(queryString);
  const active = params.get("sort") === sort;
  const direction = active && params.get("direction") === "desc" ? "asc" : "desc";
  return (
    <th className="px-3 py-3">
      <Link
        href={buildHref(queryString, { sort, direction })}
        className="inline-flex items-center gap-1 hover:text-[#2277ee]"
      >
        {label}
        {active ? (
          direction === "asc" ? (
            <ArrowUpAZ className="h-3 w-3" />
          ) : (
            <ArrowDownAZ className="h-3 w-3" />
          )
        ) : null}
      </Link>
    </th>
  );
}

type PublicationPreflightProps = {
  data: {
    totalSelected: number;
    eligible: number;
    blocked: Array<{ sku: string; name: string; reasons: string[] }>;
  };
  onClose: () => void;
  onConfirm: () => void;
};
