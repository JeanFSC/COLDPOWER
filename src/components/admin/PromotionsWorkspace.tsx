"use client";

import {
  AlertTriangle,
  Archive,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Layers3,
  MoreHorizontal,
  Package,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminSparkline } from "@/components/admin/AdminCharts";
import { PromotionForm, type PromotionDraft, type PromotionPickerOption } from "@/components/admin/PromotionForm";
import type {
  PromotionCalendarItem,
  PromotionDetail,
  PromotionImpact,
  PromotionPage,
  PromotionPageItem,
} from "@/lib/promotion-repository";
import { formatDateTime, formatMoney } from "@/lib/order-display";
import { createPromotionCalendarScale, differencePromotionCalendarDays, promotionCalendarDateKey, promotionCalendarTicks, scalePromotionDate, scalePromotionRange } from "@/lib/promotion-calendar";

type WorkspaceProps = {
  data: PromotionPage;
  currentQuery: string;
  selectedId?: string;
  selectedDetail?: PromotionDetail | null;
  formOpen?: boolean;
  editId?: string;
  editPromotion?: PromotionDraft;
  products: PromotionPickerOption[];
  categories: PromotionPickerOption[];
  canApprove: boolean;
  canExport: boolean;
  exportHref: string;
};

const timeZone = "America/Lima";

const typeLabel: Record<PromotionPageItem["type"], string> = {
  PERCENTAGE: "Porcentaje sobre precio base",
  AMOUNT: "Monto fijo de descuento",
  SPECIAL_PRICE: "Precio especial",
};

const policyLabel: Record<string, string> = {
  EXCLUSIVE: "Exclusiva",
  BEST_VALUE: "Mejor valor",
  STACKABLE: "Combinable",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Activa",
  SCHEDULED: "Programada",
  DRAFT: "Borrador",
  INACTIVE: "Pausada",
  EXPIRED: "Vencida",
};

const actionLabel: Record<string, string> = {
  "promotions.created": "Campaña creada",
  "promotions.updated": "Campaña actualizada",
  "promotions.approved": "Aprobación registrada",
  "promotions.rejected": "Aprobación rechazada",
  "promotions.applied": "Aplicación registrada",
};

function formatDate(value: Date | string, withYear = false) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone,
  }).format(new Date(value)).replace(" de ", " ").replaceAll(".", "");
}

function formatRange(start: Date | string, end: Date | string, withYear = false) {
  return `${formatDate(start, withYear)} → ${formatDate(end, withYear)}`;
}

function daysUntil(value: Date | string) {
  return differencePromotionCalendarDays(promotionCalendarDateKey(new Date()), promotionCalendarDateKey(value));
}

function formatRelativeDays(value: Date | string, futureText: string, pastText: string) {
  const days = daysUntil(value);
  if (days > 0) return `${futureText} ${days} d`;
  if (days < 0) return `${pastText} ${Math.abs(days)} d`;
  return "hoy";
}

function benefitLabel(item: Pick<PromotionPageItem, "type" | "discountValue">) {
  const value = Number(item.discountValue);
  if (item.type === "PERCENTAGE") return `−${value.toLocaleString("es-PE", { maximumFractionDigits: 2 })} %`;
  if (item.type === "AMOUNT") return `− ${formatMoney(value, "PEN")}`;
  return `Precio especial ${formatMoney(value, "PEN")}`;
}

function benefitCompactLabel(item: Pick<PromotionPageItem, "type" | "discountValue">) {
  const value = Number(item.discountValue);
  if (item.type === "PERCENTAGE") return `−${value.toLocaleString("es-PE", { maximumFractionDigits: 2 })} %`;
  if (item.type === "AMOUNT") return `− ${formatMoney(value, "PEN")}`;
  return formatMoney(value, "PEN");
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count.toLocaleString("es-PE")} ${count === 1 ? singular : plural}`;
}

function productCountLabel(count: number) {
  return countLabel(count, "producto", "productos");
}

function categoryCountLabel(count: number) {
  return countLabel(count, "categoría", "categorías");
}

function campaignCountLabel(count: number) {
  return countLabel(count, "campaña", "campañas");
}

function applicationCountLabel(count: number) {
  return countLabel(count, "aplicación", "aplicaciones");
}

function conflictCountLabel(count: number) {
  return countLabel(count, "conflicto", "conflictos");
}

function approvalLabel(value: string) {
  if (value === "PENDING") return "Por aprobar";
  if (value === "APPROVED") return "Aprobada";
  if (value === "REJECTED") return "Rechazada";
  return "No requerida";
}

function approvalClass(value: string) {
  if (value === "PENDING") return "border-orange-200 bg-orange-50 text-orange-700";
  if (value === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function statusClass(value: string) {
  if (value === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "SCHEDULED") return "border-blue-200 bg-blue-50 text-blue-700";
  if (value === "EXPIRED") return "border-slate-200 bg-slate-50 text-slate-600";
  if (value === "INACTIVE") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-orange-200 bg-orange-50 text-orange-700";
}

function priorityLevel(priority: number) {
  if (priority >= 5) return 1;
  if (priority >= 4) return 2;
  if (priority >= 3) return 3;
  if (priority >= 2) return 4;
  return 5;
}

function makeQuery(currentQuery: string, changes: Record<string, string | null>) {
  const params = new URLSearchParams(currentQuery);
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const value = params.toString();
  return value ? `/admin/promociones?${value}` : "/admin/promociones";
}

export function PromotionsWorkspace({
  data,
  currentQuery,
  selectedId,
  selectedDetail,
  formOpen = false,
  editId,
  editPromotion,
  products,
  categories,
  canApprove,
  canExport,
  exportHref,
}: WorkspaceProps) {
  const router = useRouter();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  const navigate = useCallback((href: string) => {
    setMenuId(null);
    router.push(href, { scroll: false });
  }, [router]);

  const closeLayer = useCallback(() => {
    navigate(makeQuery(currentQuery, { id: null, new: null, edit: null }));
  }, [currentQuery, navigate]);

  const openDetail = useCallback((id: string) => {
    navigate(makeQuery(currentQuery, { id, new: null, edit: null }));
  }, [currentQuery, navigate]);

  const openForm = useCallback((id?: string) => {
    navigate(makeQuery(currentQuery, { id: null, new: id ? null : "1", edit: id ?? null }));
  }, [currentQuery, navigate]);

  async function readApiError(response: Response) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } | string } | null;
    return typeof payload?.error === "string" ? payload.error : payload?.error?.message ?? "No se pudo completar la acción.";
  }

  async function changeStatus(item: PromotionPageItem, nextStatus: "ACTIVE" | "INACTIVE") {
    if (busyId) return;
    if (nextStatus === "INACTIVE" && !window.confirm(`¿Pausar “${item.name}”? Se conservará el historial y dejará de aplicarse.`)) return;
    setBusyId(item.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/promociones/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setMessage(nextStatus === "ACTIVE" ? "Campaña activada y auditada." : "Campaña pausada y auditada.");
      setMessageTone("success");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cambiar el estado.");
      setMessageTone("error");
    } finally {
      setBusyId(null);
    }
  }

  async function approve(item: PromotionPageItem) {
    if (busyId || item.approvalStatus !== "PENDING") return;
    setBusyId(item.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/promociones/${encodeURIComponent(item.id)}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "APPROVED" }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setMessage("Aprobación registrada y auditada.");
      setMessageTone("success");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo aprobar la campaña.");
      setMessageTone("error");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(item: PromotionPageItem) {
    if (busyId) return;
    setBusyId(item.id);
    setMessage(null);
    try {
      const detailResponse = await fetch(`/api/admin/promociones/${encodeURIComponent(item.id)}`, { cache: "no-store" });
      if (!detailResponse.ok) throw new Error(await readApiError(detailResponse));
      const detailPayload = await detailResponse.json() as { data?: PromotionDetail };
      const detail = detailPayload.data;
      if (!detail) throw new Error("No se pudo leer el alcance de la campaña.");
      const response = await fetch("/api/admin/promociones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${item.name} · copia`,
          description: detail.promotion.description ?? "",
          type: detail.promotion.type,
          discountValue: detail.promotion.discountValue,
          startsAt: detail.promotion.startsAt,
          endsAt: detail.promotion.endsAt,
          status: "DRAFT",
          bannerAssetId: detail.promotion.bannerAssetId,
          productIds: detail.products.map((entry) => entry.productId),
          categoryIds: detail.categories.map((entry) => entry.categoryId),
          priority: detail.promotion.priority,
          policy: detail.promotion.policy,
        }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setMessage("Borrador duplicado y auditado.");
      setMessageTone("success");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo duplicar la campaña.");
      setMessageTone("error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={`promotions-workspace relative -mx-1 -mt-5 min-w-0 pb-20 lg:mx-0 lg:mt-0 lg:pb-8 ${selectedDetail && !formOpen ? "xl:pr-[556px]" : ""}`}>
      <header className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-blue-600">Comercial</p>
          <h1 className="mt-1 font-display text-[29px] font-bold leading-none tracking-[-0.035em] text-slate-900">Promociones</h1>
          <p className="mt-1 max-w-[300px] text-[11px] leading-[15px] text-slate-500 lg:mt-2 lg:max-w-3xl lg:text-[13px] lg:leading-5"><span className="hidden lg:inline">Campañas sobre el precio base, con vigencia, alcance y trazabilidad.</span><span className="lg:hidden">Controla vigencia, alcance y aprobación sin perder el precio base.</span></p>
        </div>
        <div className="absolute right-0 top-0 flex shrink-0 items-center gap-2 pb-1 lg:static lg:flex">
          {canExport ? <a href={exportHref} className="hidden h-9 items-center gap-2 rounded-[9px] border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 lg:inline-flex"><ArrowDownToLine className="h-4 w-4" aria-hidden="true" />Exportar CSV</a> : null}
          <button type="button" onClick={() => openForm()} aria-label="Acciones de promociones" className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] border border-slate-200 bg-white text-slate-700 shadow-2xs lg:hidden"><MoreHorizontal className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" onClick={() => openForm()} className="hidden h-9 items-center gap-2 rounded-[9px] bg-blue-600 px-4 text-xs font-bold text-white shadow-[0_3px_7px_rgba(37,99,235,.16)] transition hover:bg-blue-700 lg:inline-flex"><Plus className="h-4 w-4" aria-hidden="true" />Nueva promoción</button>
        </div>
      </header>

      <PromotionKpis metrics={data.metrics} />

      <div className="mt-3 xl:hidden">
         <SoonToExpireList items={data.items} metrics={data.metrics} onOpen={openDetail} />
      </div>

      <div className="mt-3 hidden xl:block">
        <PromotionTimeline items={data.calendar} now={new Date(data.generatedAt)} currentQuery={currentQuery} onOpen={openDetail} />
      </div>

      <PromotionQueue
        data={data}
        currentQuery={currentQuery}
        selectedId={selectedId}
        onOpen={openDetail}
        onEdit={openForm}
        onApprove={approve}
        onChangeStatus={changeStatus}
        onDuplicate={duplicate}
        menuId={menuId}
        setMenuId={setMenuId}
        busyId={busyId}
      />

      {message ? <div role={messageTone === "error" ? "alert" : "status"} className={`fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-xl border px-4 py-3 text-xs font-bold shadow-lg ${messageTone === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{message}</div> : null}

      {selectedDetail && !formOpen ? <PromotionDetailDrawer detail={selectedDetail} canApprove={canApprove} onClose={closeLayer} onEdit={() => openForm(selectedDetail.promotion.id)} onApprove={() => void approve(data.items.find((item) => item.id === selectedDetail.promotion.id) ?? ({ ...selectedDetail.promotion, productCount: 0, categoryCount: 0, usage30Applications: 0, usage30Discount: "0.00", creatorName: null, banner: null, conflicts: selectedDetail.conflicts } as PromotionPageItem))} onChangeStatus={(nextStatus) => void changeStatus(data.items.find((item) => item.id === selectedDetail.promotion.id) ?? ({ ...selectedDetail.promotion, productCount: 0, categoryCount: 0, usage30Applications: 0, usage30Discount: "0.00", creatorName: null, banner: null, conflicts: selectedDetail.conflicts } as PromotionPageItem), nextStatus)} /> : null}
      {formOpen ? <PromotionForm key={editId ?? "new"} products={products} categories={categories} initialPromotion={editPromotion} editId={editId} approvalThreshold={data.approvalThreshold} onClose={closeLayer} /> : null}
      <button type="button" onClick={() => openForm()} className="fixed bottom-3 left-3 right-3 z-40 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,.28)] lg:hidden"><Plus className="h-4 w-4" aria-hidden="true" />Nueva promoción</button>
    </div>
  );
}

function PromotionKpis({ metrics }: { metrics: PromotionPage["metrics"] }) {
  const discountDelta = Number(metrics.discountPrevious30) > 0 ? ((Number(metrics.discount30) - Number(metrics.discountPrevious30)) / Number(metrics.discountPrevious30)) * 100 : null;
  const totalApplications = metrics.checkoutApplications30 + metrics.quoteApplications30;
  const checkoutShare = totalApplications ? Math.round((metrics.checkoutApplications30 / totalApplications) * 100) : 0;
  const quoteShare = totalApplications ? 100 - checkoutShare : 0;
  const cards = [
    { label: "Activas ahora", value: metrics.activeNow.toLocaleString("es-PE"), note: metrics.expiringSoon ? `${campaignCountLabel(metrics.expiringSoon)} ${metrics.expiringSoon === 1 ? "vence" : "vencen"} en ≤ 7 días` : "Sin vencimientos próximos", icon: Tag, iconClass: "bg-blue-100 text-blue-600", noteClass: metrics.expiringSoon ? "text-orange-700" : "text-emerald-700" },
    { label: "Descuento entregado · 30 d", mobileLabel: "Descuento · 30 d", value: formatMoney(metrics.discount30, "PEN"), note: discountDelta === null ? "Sin período anterior comparable" : `${discountDelta >= 0 ? "▲" : "▼"} ${Math.abs(discountDelta).toFixed(1)}% vs. período anterior`, icon: Layers3, iconClass: "bg-emerald-100 text-emerald-600", noteClass: discountDelta === null || discountDelta >= 0 ? "text-emerald-700" : "text-rose-700", spark: true },
    { label: "Aplicaciones · 30 d", value: metrics.applications30.toLocaleString("es-PE"), note: totalApplications ? `${checkoutShare}% checkout · ${quoteShare}% cotización` : "Sin aplicaciones en la ventana", icon: WalletCards, iconClass: "bg-violet-100 text-violet-600", split: true },
    { label: "Por aprobar", value: metrics.pendingApproval.toLocaleString("es-PE"), note: metrics.oldestPendingAt ? `más antigua: ${formatRelativeDays(metrics.oldestPendingAt, "en", "hace")}` : "Todo al día", icon: Clock3, iconClass: "bg-orange-100 text-orange-600", noteClass: metrics.pendingApproval ? "text-orange-700" : "text-emerald-700" },
  ];
  return <section className="mt-3 grid items-start grid-cols-2 gap-2 xl:grid-cols-4 xl:gap-3" aria-label="Indicadores de promociones">
    {cards.map((card) => <article key={card.label} className="relative min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white p-2 shadow-2xs lg:p-3.5">
      <div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400"><span className="hidden lg:inline">{card.label}</span><span className="lg:hidden">{card.mobileLabel ?? card.label}</span></span><span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[9px] lg:h-7 lg:w-7 ${card.iconClass}`}><card.icon className="h-3 w-3 lg:h-3.5 lg:w-3.5" aria-hidden="true" /></span></div>
      <p className="mt-0.5 text-[20px] font-bold leading-none tracking-[-0.035em] text-slate-900 lg:mt-2 lg:text-[22px] xl:text-2xl">{card.value}</p>
      <p className={`${card.split ? "hidden lg:block" : "block"} mt-0 truncate text-[9px] leading-3 lg:mt-1.5 lg:text-[10px] lg:leading-4 ${card.noteClass ?? "text-slate-500"}`}>{card.note}</p>
      {card.spark ? <AdminSparkline tone="blue" data={metrics.dailyDiscount30} className="mt-1.5 block h-5 w-[100px] max-w-full lg:absolute lg:bottom-2 lg:right-3 lg:mt-0 lg:h-7 lg:w-[92px]" ariaLabel="Tendencia diaria del descuento entregado en los últimos 30 días" /> : null}
      {card.split ? <div className="mt-1.5 lg:mt-2.5"><div role="img" className="flex h-1.5 overflow-hidden rounded-full bg-slate-100" aria-label={totalApplications ? `${checkoutShare}% checkout y ${quoteShare}% cotización` : "Sin aplicaciones"}><span className="bg-blue-600" style={{ width: `${checkoutShare}%` }} /><span className="bg-violet-500" style={{ width: `${quoteShare}%` }} /></div><div className="mt-1 flex gap-2 whitespace-nowrap text-[8px] text-slate-500"><span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />Checkout {checkoutShare}%</span><span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-violet-500" aria-hidden="true" />Cotización {quoteShare}%</span></div></div> : null}
    </article>)}
  </section>;
}

function PromotionTimeline({ items, now, currentQuery, onOpen }: { items: PromotionCalendarItem[]; now: Date; currentQuery: string; onOpen: (id: string) => void }) {
  const today = now;
  const scale = createPromotionCalendarScale(today);
  const visible = items.slice(0, 6);
  const ticks = promotionCalendarTicks(scale);
  const conflictCount = items.filter((item) => item.hasConflict).length;
  const rangeStyle = (item: PromotionCalendarItem) => {
    const range = scalePromotionRange(item.startsAt, item.endsAt, scale);
    return { left: `${range.left}%`, width: `${range.width}%` };
  };
  return <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs" aria-labelledby="promotion-calendar-title">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3"><div><h2 id="promotion-calendar-title" className="text-[15px] font-bold text-slate-900">Calendario de campañas</h2><p className="mt-0.5 text-[10px] text-slate-500">Vigencia visible a 8 semanas · hoy, {formatDate(today)}</p></div><div className="flex items-center gap-3 text-[10px] font-bold"><span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700"><AlertTriangle className="h-3 w-3" aria-hidden="true" />{conflictCountLabel(conflictCount)}</span><Link href={makeQuery(currentQuery, { status: null, approval: null, conflict: "1" })} className="text-blue-600 hover:underline">Ver conflictos <ChevronRight className="inline h-3 w-3" aria-hidden="true" /></Link></div></div>
    <div className="px-4 pt-2"><div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 text-[9px] font-bold text-slate-400"><span /> <div className="relative grid grid-cols-8">{ticks.map((tick) => <span key={tick} className="text-center">{formatDate(new Date(`${tick}T12:00:00-05:00`))}</span>)}<span className="pointer-events-none absolute -top-1 -translate-x-1/2 text-[8px] font-bold text-blue-600" style={{ left: `${scalePromotionDate(today, scale).left}%` }}>Hoy</span></div></div>
      <div className="mt-1 grid gap-1.5">{visible.length ? visible.map((item) => <button type="button" key={item.id} onClick={() => onOpen(item.id)} className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-3 rounded-md text-left hover:bg-slate-50"><span className="truncate text-[10px] font-medium text-slate-600">{item.name}</span><span className="relative h-5 border-y border-slate-100 bg-[linear-gradient(to_right,#eef2f6_1px,transparent_1px)] [background-size:12.5%_100%]"><span className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-[4px] shadow-sm ${item.effectiveStatus === "ACTIVE" ? "bg-emerald-600" : item.effectiveStatus === "DRAFT" && item.status === "ACTIVE" ? "bg-blue-600" : item.approvalStatus === "PENDING" ? "bg-orange-600" : "bg-slate-400"}`} style={rangeStyle(item)} />{item.hasConflict ? <span className="absolute top-1/2 h-3 -translate-y-1/2 rounded-[4px] border border-rose-500 bg-rose-100/85" style={rangeStyle(item)} aria-label="Tramo en conflicto" /> : null}<span className="absolute bottom-[-3px] top-[-3px] w-px bg-blue-500" style={{ left: `${scalePromotionDate(today, scale).left}%` }} aria-label="Hoy" /></span></button>) : <p className="py-6 text-center text-xs text-slate-500">No hay campañas en la ventana seleccionada.</p>}</div>
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 py-2 text-[9px] text-slate-500"><div className="flex flex-wrap items-center gap-3"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-600" />Activa</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-blue-600" />Programada</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-orange-600" />Por aprobar</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-slate-400" />Borrador</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm border border-rose-500 bg-rose-100" />Conflicto</span></div>{items.length > 6 ? <Link href={makeQuery(currentQuery, { pageSize: "100" })} className="font-bold text-blue-600 hover:underline">Ver todas</Link> : null}</div>
    </div>
  </section>;
}

function SoonToExpireList({ items, metrics, onOpen }: { items: PromotionPageItem[]; metrics: PromotionPage["metrics"]; onOpen: (id: string) => void }) {
  const rows = items.filter((item) => item.effectiveStatus === "ACTIVE" && daysUntil(item.endsAt) <= 7).slice(0, 2);
  return <section className="rounded-xl border border-slate-200/90 bg-white p-2 shadow-2xs lg:p-3" aria-labelledby="soon-title"><div className="flex items-start justify-between gap-3"><div><h2 id="soon-title" className="text-[14px] font-bold text-slate-900">Vencen pronto</h2><p className="mt-0.5 text-[10px] text-slate-500">Revisa primero las campañas con menos de 7 días.</p></div><span className="rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700">{campaignCountLabel(metrics.expiringSoon)}</span></div>{rows.length ? <div className="mt-1 grid gap-1 lg:mt-3 lg:gap-2">{rows.map((item) => <button type="button" key={item.id} onClick={() => onOpen(item.id)} className="grid gap-0.5 text-left lg:gap-1"><span className="flex items-center justify-between gap-3 text-[10px] font-bold text-slate-700 lg:text-[11px]"><span className="truncate">{item.name}</span><span className="shrink-0 text-orange-700">{Math.max(0, daysUntil(item.endsAt))} d</span></span><span className="text-[8px] text-slate-400 lg:text-[9px]">{productCountLabel(item.productCount)} · {formatRange(item.startsAt, item.endsAt)}</span><span className="h-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-orange-600" style={{ width: `${Math.min(100, Math.max(12, 100 - Math.max(0, daysUntil(item.endsAt)) * 8))}%` }} /></span></button>)}</div> : <p className="mt-2 text-xs text-slate-500 lg:mt-3">{metrics.expiringSoon ? "Hay vencimientos próximos fuera de la página actual." : "No hay campañas por vencer en 7 días."}</p>}</section>;
}

function FilterChips({ data, currentQuery }: { data: PromotionPage; currentQuery: string }) {
  const chips = [
    ["Todas", null, data.facets.total, "", false],
    ["Activas", "ACTIVE", data.facets.active, "", false],
    ["Programadas", "SCHEDULED", data.facets.scheduled, "", true],
    ["Por aprobar", null, data.facets.pending, "approval=PENDING", false],
    ["Borradores", "DRAFT", data.facets.draft, "", true],
    ["Vencidas", "EXPIRED", data.facets.expired, "", true],
    ["Con conflicto", null, data.facets.conflict, "conflict=1", false],
  ] as const;
  return <div className="flex flex-wrap gap-1.5">{chips.map(([label, status, countValue, extra, mobileHidden]) => {
    const href = extra ? `/admin/promociones?${extra}` : makeQuery(currentQuery, { status, approval: null, conflict: null, page: null });
    const active = (status === "ACTIVE" && new URLSearchParams(currentQuery).get("status") === "ACTIVE") || (extra && new URLSearchParams(currentQuery).toString().includes(extra));
    return <Link key={label} href={href} className={`${mobileHidden ? "hidden lg:inline-flex" : "inline-flex"} min-h-7 items-center gap-1 rounded-lg border px-2.5 text-[10px] font-bold transition ${active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:text-blue-700"}`}>{label} <span className="text-[9px] opacity-70">{countValue}</span></Link>;
  })}</div>;
}

type QueueProps = {
  data: PromotionPage;
  currentQuery: string;
  selectedId?: string;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onApprove: (item: PromotionPageItem) => void;
  onChangeStatus: (item: PromotionPageItem, nextStatus: "ACTIVE" | "INACTIVE") => void;
  onDuplicate: (item: PromotionPageItem) => void;
  menuId: string | null;
  setMenuId: (id: string | null) => void;
  busyId: string | null;
};

function PromotionQueue({ data, currentQuery, selectedId, onOpen, onEdit, onApprove, onChangeStatus, onDuplicate, menuId, setMenuId, busyId }: QueueProps) {
  const query = new URLSearchParams(currentQuery);
  return <section className="mt-3 overflow-visible rounded-none border-0 bg-white shadow-none lg:overflow-hidden lg:rounded-xl lg:border lg:border-slate-200/90 lg:shadow-2xs" aria-labelledby="promotion-queue-title">
    <div className="flex w-full flex-wrap items-start justify-between gap-3 px-0 pb-2 pt-0 lg:px-4 lg:pb-2 lg:pt-3 xl:w-auto"><div className="w-full xl:w-auto"><div className="flex items-center justify-between gap-2"><h2 id="promotion-queue-title" className="text-[15px] font-bold text-slate-900">Cola de campañas</h2><span className="shrink-0 text-[10px] text-slate-400 lg:hidden">{campaignCountLabel(data.totalItems)}</span><span className="hidden text-[10px] text-slate-400 xl:inline">Prioriza vencimientos, alcance y aprobaciones antes de activar.</span></div><p className="mt-0.5 hidden text-[10px] text-slate-500 xl:block">Vigencia, alcance y aprobaciones en una sola vista.</p></div><Link href="/admin/precios#reglas-descuento" className="hidden items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline xl:inline-flex">Reglas de descuento <ExternalLink className="h-3 w-3" aria-hidden="true" /></Link></div>
    <div className="block overflow-visible px-0 pb-2 lg:overflow-x-auto lg:px-4 lg:pb-3"><FilterChips data={data} currentQuery={currentQuery} /></div>
    <form action="/admin/promociones" method="get" className="hidden gap-2 border-t border-slate-100 px-4 py-3 lg:grid lg:grid-cols-[minmax(0,1fr)_170px_170px_auto] lg:items-end"><label className="relative block text-[10px] font-bold text-slate-500"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><span className="sr-only">Buscar por nombre o descripción</span><input type="search" name="query" defaultValue={query.get("query") ?? ""} placeholder="Buscar por nombre o descripción" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label><label className="grid gap-1 text-[10px] font-bold text-slate-500">Tipo<select name="type" defaultValue={query.get("type") ?? ""} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"><option value="">Todos</option><option value="PERCENTAGE">Porcentaje</option><option value="AMOUNT">Monto fijo</option><option value="SPECIAL_PRICE">Precio especial</option></select></label><label className="grid gap-1 text-[10px] font-bold text-slate-500">Alcance<select name="scope" defaultValue={query.get("scope") ?? ""} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"><option value="">Todos</option><option value="PRODUCTS">Con productos</option><option value="CATEGORIES">Con categorías</option></select></label><button type="submit" className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700">Filtrar</button></form>
    <div className="hidden overflow-x-auto px-4 pb-3 lg:block"><PromotionTable {...{ data, currentQuery, selectedId, onOpen, onEdit, onApprove, onChangeStatus, onDuplicate, menuId, setMenuId, busyId }} /></div>
    <div className="grid gap-2 px-0 pb-3 lg:hidden"><PromotionCards {...{ data, currentQuery, selectedId, onOpen, onEdit, onApprove, onChangeStatus, onDuplicate, menuId, setMenuId, busyId }} /></div>
    <div className="hidden items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-[10px] text-slate-500 lg:flex"><span>{data.items.length ? `${data.items.length} de ${data.totalItems} ${data.totalItems === 1 ? "campaña" : "campañas"} · filtros guardados en la URL` : "No hay campañas con estos filtros."}</span><div className="flex gap-1.5"><Link aria-label="Página anterior" href={data.page > 1 ? makeQuery(currentQuery, { page: String(data.page - 1) }) : "#"} className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 ${data.page > 1 ? "text-slate-600 hover:bg-slate-50" : "pointer-events-none text-slate-300"}`}><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /></Link><Link aria-label="Página siguiente" href={data.page < data.totalPages ? makeQuery(currentQuery, { page: String(data.page + 1) }) : "#"} className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 ${data.page < data.totalPages ? "text-slate-600 hover:bg-slate-50" : "pointer-events-none text-slate-300"}`}><ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div></div>
  </section>;
}

function CampaignIcon({ item }: { item: PromotionPageItem }) {
  const tone = item.conflicts.length ? "bg-rose-50 text-rose-600" : item.approvalStatus === "PENDING" ? "bg-orange-50 text-orange-600" : item.type === "SPECIAL_PRICE" ? "bg-violet-50 text-violet-600" : "bg-emerald-50 text-emerald-600";
  return <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
    {item.type === "SPECIAL_PRICE" ? <CalendarDays className="h-4 w-4" aria-hidden="true" /> : item.type === "AMOUNT" ? <Tag className="h-4 w-4" aria-hidden="true" /> : <Package className="h-4 w-4" aria-hidden="true" />}
  </span>;
}

function CampaignName({ item }: { item: PromotionPageItem }) {
  return <div className="flex min-w-0 items-center gap-2.5"><CampaignIcon item={item} /><span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-800" title={item.name}>{item.name}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500" title={item.description ?? "Sin descripción"}>{item.description || "Sin descripción registrada"}</span></span></div>;
}

function ScopeLabel({ item }: { item: PromotionPageItem }) {
  return item.productCount || item.categoryCount ? <span className="block text-[10px] font-semibold text-slate-700">{productCountLabel(item.productCount)}</span> : <span className="flex items-start gap-1 text-[10px] font-bold text-orange-700"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />Sin alcance: aplica a todo</span>;
}

function CampaignActions({ item, onOpen, onEdit, onApprove, onChangeStatus, onDuplicate, menuId, setMenuId, busyId }: QueueProps & { item: PromotionPageItem }) {
  const isOpen = menuId === item.id;
  const busy = busyId === item.id;
  return <div className="relative flex justify-end"><button type="button" aria-label={`Acciones de ${item.name}`} aria-expanded={isOpen} onClick={(event) => { event.stopPropagation(); setMenuId(isOpen ? null : item.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"><MoreHorizontal className="h-4 w-4" aria-hidden="true" /></button>{isOpen ? <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => onEdit(item.id)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Editar</button><button type="button" disabled={busy} onClick={() => onDuplicate(item)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Copy className="h-3.5 w-3.5" aria-hidden="true" />Duplicar</button>{item.approvalStatus === "PENDING" ? <button type="button" disabled={busy} onClick={() => onApprove(item)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Aprobar</button> : null}{item.effectiveStatus === "ACTIVE" ? <button type="button" disabled={busy} onClick={() => onChangeStatus(item, "INACTIVE")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50"><Pause className="h-3.5 w-3.5" aria-hidden="true" />Pausar</button> : <button type="button" disabled={busy || item.approvalStatus === "PENDING"} onClick={() => onChangeStatus(item, "ACTIVE")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><Play className="h-3.5 w-3.5" aria-hidden="true" />Activar</button>}<button type="button" disabled={busy} onClick={() => onChangeStatus(item, "INACTIVE")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Archive className="h-3.5 w-3.5" aria-hidden="true" />Archivar / desactivar</button><button type="button" onClick={() => onOpen(item.id)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold text-slate-500 hover:bg-slate-50"><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />Ver detalle</button></div> : null}</div>;
}

function PromotionTable(props: QueueProps) {
  const { data, selectedId, onOpen } = props;
  return <table className="w-full min-w-[1080px] table-fixed text-left"><thead className="border-b border-slate-200 bg-slate-50/80 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400"><tr><th className="w-[24%] px-2.5 py-2.5">Campaña</th><th className="w-[13%] px-2.5 py-2.5">Beneficio</th><th className="w-[12%] px-2.5 py-2.5">Alcance</th><th className="w-[16%] px-2.5 py-2.5">Vigencia</th><th className="w-[13%] px-2.5 py-2.5">Reglas</th><th className="w-[11%] px-2.5 py-2.5">Aprobación</th><th className="w-[9%] px-2.5 py-2.5">Uso 30 d</th><th className="w-10 px-2.5 py-2.5"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id} className={`border-b border-slate-100 last:border-0 ${selectedId === item.id ? "bg-blue-50/60" : "hover:bg-slate-50/70"}`}><td className={`border-l-2 px-2.5 py-2.5 ${selectedId === item.id ? "border-blue-600" : "border-transparent"}`}><button type="button" className="block w-full text-left" onClick={() => onOpen(item.id)}><CampaignName item={item} /></button></td><td className="px-2.5 py-2.5"><span className={`inline-flex max-w-full rounded-lg border px-2 py-1 text-[10px] font-bold ${item.type === "AMOUNT" ? "border-orange-200 bg-orange-50 text-orange-700" : item.type === "SPECIAL_PRICE" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-blue-200 bg-blue-50 text-blue-700"}`} title={typeLabel[item.type]}>{benefitCompactLabel(item)}</span></td><td className="px-2.5 py-2.5"><ScopeLabel item={item} /><span className="block text-[9px] text-slate-500">{categoryCountLabel(item.categoryCount)}</span></td><td className="px-2.5 py-2.5"><span className="block text-[10px] text-slate-600">{formatRange(item.startsAt, item.endsAt)}</span><span className="mt-1 block h-1 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${item.effectiveStatus === "ACTIVE" ? "bg-emerald-600" : item.approvalStatus === "PENDING" ? "bg-orange-600" : "bg-blue-600"}`} style={{ width: `${item.effectiveStatus === "ACTIVE" ? Math.min(100, Math.max(8, 100 - Math.max(0, daysUntil(item.endsAt)) * 4)) : item.effectiveStatus === "SCHEDULED" ? 8 : 36}%` }} /></span><span className="mt-1 block text-[9px] text-slate-400">{item.effectiveStatus === "ACTIVE" ? formatRelativeDays(item.endsAt, "vence en", "venció hace") : item.effectiveStatus === "SCHEDULED" ? formatRelativeDays(item.startsAt, "inicia en", "inició hace") : statusLabel[item.effectiveStatus]}</span></td><td className="px-2.5 py-2.5"><span className="flex flex-wrap gap-1"><span className="rounded-md bg-slate-100 px-1.5 py-1 text-[9px] font-bold text-slate-600" title="Prioridad 1 gana sobre prioridad 5">P{priorityLevel(item.priority)}</span><span className="rounded-md bg-indigo-50 px-1.5 py-1 text-[9px] font-bold text-indigo-700">{policyLabel[item.policy] ?? item.policy}</span></span>{item.conflicts.length ? <span className="mt-1 block text-[9px] font-bold text-rose-700">{productCountLabel(item.conflicts[0].affectedProductCount)} en conflicto</span> : null}</td><td className="px-2.5 py-2.5"><span className={`inline-flex rounded-md border px-1.5 py-1 text-[9px] font-bold ${approvalClass(item.approvalStatus)}`}>{approvalLabel(item.approvalStatus)}</span></td><td className="px-2.5 py-2.5"><span className="block text-[10px] font-bold text-slate-700">{applicationCountLabel(item.usage30Applications)}</span><span className="mt-0.5 block text-[9px] text-slate-500">{formatMoney(item.usage30Discount, "PEN")}</span></td><td className="px-2.5 py-2.5"><CampaignActions item={item} {...props} /></td></tr>)}</tbody></table>;
}

function PromotionCards(props: QueueProps) {
  const { data, selectedId, onOpen } = props;
  return data.items.length ? data.items.slice(0, 8).map((item) => <article key={item.id} className={`rounded-xl border bg-white p-1.5 shadow-2xs lg:p-2.5 ${selectedId === item.id ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200"}`}><button type="button" className="block w-full text-left" onClick={() => onOpen(item.id)}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><span className="block truncate text-[11px] font-bold leading-[13px] text-slate-800">{item.name}</span><span className="mt-0.5 block truncate text-[8px] leading-[10px] text-slate-500 lg:text-[9px] lg:leading-4">{productCountLabel(item.productCount)} · {categoryCountLabel(item.categoryCount)}</span></div><span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[9px] font-bold leading-3 lg:py-1 lg:text-[10px] ${item.type === "SPECIAL_PRICE" ? "border-violet-200 bg-violet-50 text-violet-700" : item.type === "AMOUNT" ? "border-orange-200 bg-orange-50 text-orange-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>{benefitCompactLabel(item)}</span></div><div className="mt-0.5 flex items-center justify-between gap-2 text-[9px] text-slate-500 lg:mt-2"><span>{item.effectiveStatus === "ACTIVE" ? formatRange(item.startsAt, item.endsAt) : item.effectiveStatus === "SCHEDULED" ? formatRelativeDays(item.startsAt, "inicia en", "inició hace") : formatDate(item.endsAt)}</span><span className={`rounded-md border px-1.5 py-1 text-[9px] font-bold ${statusClass(item.effectiveStatus)}`}>{statusLabel[item.effectiveStatus]}</span></div><span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-slate-100 lg:mt-2"><span className={`block h-full rounded-full ${item.effectiveStatus === "ACTIVE" ? "bg-emerald-600" : "bg-blue-600"}`} style={{ width: `${item.effectiveStatus === "ACTIVE" ? Math.min(100, Math.max(8, 100 - Math.max(0, daysUntil(item.endsAt)) * 4)) : 14}%` }} /></span></button><div className="mt-1 hidden justify-end lg:flex"><CampaignActions item={item} {...props} /></div></article>) : <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center"><p className="text-sm font-bold text-slate-700">Aún no hay campañas</p><p className="mt-1 text-xs text-slate-500">Empieza con una plantilla o crea una promoción gobernada.</p><div className="mt-3 flex justify-center gap-2"><Link href={makeQuery(props.currentQuery, { new: "1" })} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-700">Liquidación por categoría</Link><Link href={makeQuery(props.currentQuery, { new: "1" })} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700">Precio especial por SKU</Link></div></div>;
}

function PromotionDetailDrawer({ detail, canApprove, onClose, onEdit, onApprove, onChangeStatus }: { detail: PromotionDetail; canApprove: boolean; onClose: () => void; onEdit: () => void; onApprove: () => void; onChangeStatus: (status: "ACTIVE" | "INACTIVE") => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus.current?.focus(); };
  }, [onClose]);
  const item = detail.promotion;
  const effective = item.effectiveStatus;
  const conflictCount = detail.conflicts.reduce((total, conflict) => total + conflict.affectedProductCount, 0);
  const totalChannel = detail.channelUsage.reduce((total, row) => total + row.applications, 0);
  return <aside role="dialog" aria-modal="true" aria-labelledby="promotion-detail-title" className="fixed inset-0 z-[60] flex flex-col overflow-hidden border-l border-slate-200 bg-white shadow-[-12px_0_32px_rgba(16,42,67,.08)] xl:inset-y-[76px] xl:left-auto xl:right-0 xl:w-[540px]">
    <div className="min-h-0 flex-1 overflow-y-auto"><div className="border-b border-slate-200 px-5 pb-3 pt-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.08em] text-blue-600">Campaña seleccionada</p><h2 id="promotion-detail-title" className="mt-1 max-w-[390px] text-[21px] font-bold leading-[1.05] tracking-[-0.03em] text-slate-900">{item.name}</h2><span className={`mt-2 inline-flex rounded-md border px-2 py-1 text-[9px] font-bold ${statusClass(effective)}`}>{statusLabel[effective]} · {approvalLabel(item.approvalStatus).toLowerCase()}</span></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar detalle" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="h-4 w-4" aria-hidden="true" /></button></div><div className="mt-4 flex items-end justify-between gap-3"><div><p className={`text-[26px] font-bold leading-none ${item.type === "SPECIAL_PRICE" ? "text-violet-600" : "text-blue-600"}`}>{benefitLabel(item)}</p><p className="mt-1 text-[9px] text-slate-500">{typeLabel[item.type]}</p></div>{effective === "ACTIVE" ? <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">{formatRelativeDays(item.endsAt, "Vence en", "Venció hace")}</span> : null}</div></div>
      <div className="grid grid-cols-2 gap-2 px-5 py-3"><MetaBox label="Vigencia · Lima" value={formatRange(item.startsAt, item.endsAt, true)} /><MetaBox label="Alcance explícito" value={`${productCountLabel(detail.products.length)} · ${categoryCountLabel(detail.categories.length)}`} /><MetaBox label="Prioridad / política" value={`P${priorityLevel(item.priority)} · ${policyLabel[item.policy] ?? item.policy}`} /><MetaBox label="Creada por" value={detail.creatorName} /></div>
      <DrawerSection title="Impacto en precio" note={productCountLabel(detail.impact.length)}><div className="overflow-x-auto"><table className="w-full min-w-[455px] table-fixed text-[9px]"><thead className="border-y border-slate-200 bg-slate-50 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400"><tr><th className="w-[22%] px-1.5 py-2 text-left">SKU</th><th className="w-[35%] px-1.5 py-2 text-left">Producto</th><th className="w-[17%] px-1.5 py-2 text-right">Base</th><th className="w-[17%] px-1.5 py-2 text-right">Final</th><th className="w-[15%] px-1.5 py-2 text-right">Ahorro</th></tr></thead><tbody>{detail.impact.length ? detail.impact.map((impact) => <ImpactRow key={impact.productId} impact={impact} />) : <tr><td colSpan={5} className="px-2 py-4 text-center text-[10px] text-slate-500">No hay precio minorista vigente para los productos del alcance.</td></tr>}</tbody></table></div></DrawerSection>
      <DrawerSection title="Uso por canal" note="últimos 30 días"><div className="grid gap-2">{detail.channelUsage.length ? detail.channelUsage.map((row) => { const share = totalChannel ? Math.round((row.applications / totalChannel) * 100) : 0; const quote = row.contextType === "quote"; return <div key={row.contextType} className="grid grid-cols-[100px_minmax(0,1fr)_36px] items-center gap-2 text-[10px]"><span className="flex items-center gap-1.5 font-semibold text-slate-700"><i className={`h-2 w-2 rounded-full ${quote ? "bg-violet-500" : "bg-blue-600"}`} aria-hidden="true" />{quote ? "Cotización" : "Checkout"}</span><span className="min-w-0"><span className="block truncate font-bold text-slate-700">{applicationCountLabel(row.applications)} · {formatMoney(row.discount, "PEN")}</span><span className="mt-1 block h-1 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full ${quote ? "bg-violet-500" : "bg-blue-600"}`} style={{ width: `${share}%` }} /></span></span><span className="text-right text-[9px] text-slate-400">{share}%</span></div>; }) : <p className="text-[10px] text-slate-500">Sin aplicaciones registradas en los últimos 30 días.</p>}</div></DrawerSection>
      <DrawerSection title="Conflictos" note={`${productCountLabel(conflictCount)} afectados`}>{detail.conflicts.length ? <div className="grid gap-2">{detail.conflicts.map((conflict) => <div key={conflict.otherPromotionId} className="rounded-lg border border-rose-200 bg-rose-50/60 p-3"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" /><div className="min-w-0"><p className="text-[10px] font-bold text-rose-800">Choque con “{conflict.otherPromotionName}”</p><p className="mt-1 text-[9px] leading-4 text-rose-700">Comparten {productCountLabel(conflict.affectedProductCount)} durante la vigencia. Gana “{conflict.winnerPromotionName}” por prioridad P{priorityLevel(conflict.winnerPriority)}.</p><Link href={`/admin/promociones?id=${encodeURIComponent(conflict.otherPromotionId)}`} className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-rose-800 underline">Ver campaña en choque <ExternalLink className="h-3 w-3" aria-hidden="true" /></Link></div></div></div>)}</div> : <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-[10px] text-emerald-800"><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />No se detectan conflictos vigentes para este alcance.</div>}</DrawerSection>
      <DrawerSection title="Historial" note="hora de Lima"><div className="relative grid gap-3 pl-5 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-slate-200">{detail.history.length ? detail.history.slice(0, 8).map((entry, index) => <div key={entry.id} className="relative"><span className={`absolute -left-5 top-0.5 h-3 w-3 rounded-full border-2 border-white ${index === 0 ? "bg-blue-600" : entry.action.includes("approved") ? "bg-emerald-600" : entry.action.includes("rejected") ? "bg-rose-600" : "bg-orange-600"}`} /><p className="text-[10px] font-bold text-slate-700">{actionLabel[entry.action] ?? entry.action}</p><p className="mt-0.5 text-[9px] text-slate-500">{entry.actorName} · {formatDateTime(entry.createdAt)}</p></div>) : <p className="text-[10px] text-slate-500">Sin eventos de auditoría registrados.</p>}</div></DrawerSection>
    </div><div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 bg-white px-5 py-3">{effective === "ACTIVE" ? <button type="button" onClick={() => onChangeStatus("INACTIVE")} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"><Pause className="h-3.5 w-3.5" aria-hidden="true" />Pausar</button> : <button type="button" disabled={item.approvalStatus === "PENDING"} onClick={() => onChangeStatus("ACTIVE")} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Play className="h-3.5 w-3.5" aria-hidden="true" />Activar</button>}<button type="button" onClick={onEdit} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-bold text-white shadow-[0_3px_7px_rgba(37,99,235,.16)] hover:bg-blue-700"><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Editar</button>{canApprove && item.approvalStatus === "PENDING" ? <button type="button" onClick={onApprove} className="col-span-2 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Aprobar campaña</button> : null}</div>
  </aside>;
}

function ImpactRow({ impact }: { impact: PromotionImpact }) {
  return <tr className="border-b border-slate-100 last:border-0"><td className="truncate px-1.5 py-2 font-mono text-[8px] text-slate-500" title={impact.sku}>{impact.sku}</td><td className="truncate px-1.5 py-2 text-slate-700" title={impact.name}>{impact.name}</td><td className="px-1.5 py-2 text-right text-slate-500 line-through">{formatMoney(impact.baseUnitPrice, impact.currency)}</td><td className="px-1.5 py-2 text-right font-bold text-slate-800">{formatMoney(impact.finalUnitPrice, impact.currency)}</td><td className="px-1.5 py-2 text-right font-bold text-emerald-700">{impact.discountPercentage}%</td></tr>;
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-lg bg-slate-100 px-2.5 py-2.5"><p className="text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p><p className="mt-1 truncate text-[10px] font-bold text-slate-700" title={value}>{value}</p></div>;
}

function DrawerSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return <section className="border-t border-slate-200 px-5 py-3.5"><div className="mb-2 flex items-center justify-between gap-3"><h3 className="text-[14px] font-bold text-slate-900">{title}</h3>{note ? <span className="text-[9px] text-slate-400">{note}</span> : null}</div>{children}</section>;
}
