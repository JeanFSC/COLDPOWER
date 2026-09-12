"use client";

import { useEffect, useMemo, useState, useTransition, type DragEvent, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminTooltip } from "@/components/admin/AdminTooltip";
import {
  canTransitionOpportunity,
  opportunityOrigins,
  opportunityStages,
  type ActivityType,
  type OpportunityStage,
} from "@/lib/crm-validation";
import {
  pipelineOriginLabels,
  pipelineStageLabels,
  type PipelineBoardResponse,
  type PipelineCard,
  type PipelineFollowUpItem,
} from "@/lib/pipeline-contract";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Tag,
  UsersRound,
  X,
} from "lucide-react";

type PipelineWorkspaceProps = { board: PipelineBoardResponse; queryString: string };
type BoardDate = Date | string | null;
type Detail = PipelineCard & {
  notes?: string | null;
  discountPercentage?: string | null;
  marginAmount?: string | null;
  lostReason?: string | null;
  stageHistory: Array<{
    id: string;
    fromStage: OpportunityStage | null;
    toStage: OpportunityStage;
    changedBy: string;
    actorName: string;
    note: string | null;
    createdAt: BoardDate;
  }>;
  activities: Array<{
    id: string;
    type: ActivityType;
    subject: string;
    body: string | null;
    actorName: string;
    createdAt: BoardDate;
  }>;
  legacyActivities: Array<{
    id: string;
    type: ActivityType;
    subject: string;
    body: string | null;
    actorName: string;
    createdAt: BoardDate;
  }>;
  followUps: Array<{
    id: string;
    title: string;
    dueAt: BoardDate;
    status: string;
    assignedToName: string | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    dueAt: BoardDate;
    status: string;
    assignedToName: string | null;
  }>;
};
const lostReasonOptions = [
  ["PRICE", "Precio"],
  ["OUT_OF_STOCK", "Sin stock"],
  ["COMPETITION", "Competencia"],
  ["NO_RESPONSE", "No respondió"],
  ["PROJECT_CANCELLED", "Proyecto cancelado"],
  ["COMMERCIAL_TERMS", "Condiciones comerciales"],
  ["OTHER", "Otro"],
] as const;
type NewItem = {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: string;
};
type NewForm = {
  customerId: string;
  customerName: string;
  title: string;
  origin: string;
  sellerId: string;
  totalAmount: string;
  currency: "PEN" | "USD";
  nextAction: string;
  followUpAt: string;
  notes: string;
  items: NewItem[];
};

const laneTone: Record<string, { border: string; dot: string; wash: string }> = {
  NEW: { border: "border-[#2277ee]", dot: "bg-[#2277ee]", wash: "bg-[#f2f7ff]" },
  CONTACTED: { border: "border-[#3f8df5]", dot: "bg-[#3f8df5]", wash: "bg-[#f3f8ff]" },
  QUOTING: { border: "border-[#7c5cff]", dot: "bg-[#7c5cff]", wash: "bg-[#f8f6ff]" },
  FOLLOW_UP: { border: "border-[#ff9a3d]", dot: "bg-[#ff9a3d]", wash: "bg-[#fff8ef]" },
  NEGOTIATION: { border: "border-[#e07c22]", dot: "bg-[#e07c22]", wash: "bg-[#fff7ef]" },
  WON: { border: "border-[#35a673]", dot: "bg-[#35a673]", wash: "bg-[#f1fbf6]" },
};

const initialForm: NewForm = {
  customerId: "",
  customerName: "",
  title: "",
  origin: "WEB",
  sellerId: "",
  totalAmount: "",
  currency: "PEN",
  nextAction: "",
  followUpAt: "",
  notes: "",
  items: [],
};

function dateValue(value: BoardDate) {
  return value ? new Date(value) : null;
}
function dateLabel(value: BoardDate, withTime = false) {
  const date = dateValue(value);
  if (!date || Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat(
    "es-PE",
    withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" },
  ).format(date);
}
function money(value: string | number | null | undefined, currency?: string | null) {
  if (value == null || value === "") return "Sin monto";
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "Sin monto";
  return `${currency === "USD" ? "US$" : "S/"} ${new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numberValue)}`;
}
function amountList(amounts: Array<{ currency: string; amount: number }>) {
  return amounts.length
    ? amounts.map((amount) => money(amount.amount, amount.currency)).join(" · ")
    : "—";
}
function relativeAge(days: number | null) {
  return days == null ? "Sin contacto" : `${days} ${days === 1 ? "día" : "días"}`;
}
function whatsappHref(phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith("51") ? digits : `51${digits}`}`;
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  tone = "blue",
  tooltip,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  helper: React.ReactNode;
  icon: React.ReactNode;
  tone?: "blue" | "orange" | "green" | "purple";
  tooltip?: string;
  onClick?: () => void;
}) {
  const tones = {
    blue: "bg-[#eaf3ff] text-[#2277ee]",
    orange: "bg-[#fff3e8] text-[#e78321]",
    green: "bg-[#e9f8f0] text-[#35a673]",
    purple: "bg-[#f0ecff] text-[#7657ec]",
  };
  return (
    <article
      className={`min-w-0 rounded-xl border border-[#e1e9f0] bg-white p-4 shadow-[0_2px_8px_rgba(16,42,67,0.04)] sm:p-5 ${onClick ? "cursor-pointer transition hover:-translate-y-0.5 hover:border-[#bcd3eb] hover:shadow-[0_8px_20px_rgba(16,42,67,0.08)] focus-within:ring-2 focus-within:ring-[#2277ee]/20" : ""}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6e8498]">
            {label}
            {tooltip ? (
              <AdminTooltip label={tooltip}>
                <CircleHelp className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
              </AdminTooltip>
            ) : null}
          </p>
          <div className="mt-2 text-[22px] font-black tracking-[-0.04em] text-[#173654]">
            {value}
          </div>
        </div>
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2 text-[11px] font-semibold text-[#7f93a6]">{helper}</div>
    </article>
  );
}

function Card({
  card,
  canManage,
  onOpen,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  card: PipelineCard;
  canManage: boolean;
  onOpen: (id: string) => void;
  onMove: (card: PipelineCard, stage: OpportunityStage) => void;
  onDragStart: (event: DragEvent<HTMLElement>, card: PipelineCard) => void;
  onDragEnd?: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const stageChoices = opportunityStages.filter((stage) =>
    [
      "NEW",
      "CONTACTED",
      "QUOTING",
      "QUOTE_SENT",
      "FOLLOW_UP",
      "NEGOTIATION",
      "ACCEPTED",
      "LOST",
      "NO_RESPONSE",
      "CANCELLED",
    ].includes(stage),
  );
  const amount = card.totalAmount ? money(card.totalAmount, card.currency) : "Valor por definir";
  const agingTone =
    card.agingDays == null
      ? "bg-[#f1f5f8] text-[#71879b]"
      : card.agingDays <= 2
        ? "bg-[#f1f5f8] text-[#71879b]"
        : card.agingDays <= 5
          ? "bg-[#fff8ef] text-[#b56a1d]"
          : "bg-[#fff0ed] text-[#d75942]";
  return (
    <article
      draggable={canManage}
      onDragStart={(event) => onDragStart(event, card)}
      onDragEnd={onDragEnd}
      className={`group rounded-xl border bg-white p-3.5 shadow-[0_3px_10px_rgba(16,42,67,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(16,42,67,0.1)] ${card.overdue ? "border-[#f2b9a9]" : "border-[#e2eaf1]"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => onOpen(card.id)} className="min-w-0 text-left">
          <p className="truncate text-[13px] font-extrabold text-[#173654]">{card.customerName}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-[#7a8fa2]">
            {card.code} · {card.title}
          </p>
        </button>
        <div className="relative">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8ba0b2] hover:bg-[#f2f6f9]"
            aria-label="Acciones de oportunidad"
            onClick={() => setMenu((value) => !value)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menu ? (
            <div className="absolute right-0 top-8 z-20 w-48 rounded-lg border border-[#dce6ee] bg-white p-1 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[11px] font-bold text-[#304b66] hover:bg-[#f5f8fb]"
                onClick={() => {
                  setMenu(false);
                  onOpen(card.id);
                }}
              >
                Abrir detalle <ArrowRight className="ml-auto h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <button type="button" onClick={() => onOpen(card.id)} className="mt-3 block w-full text-left">
        <p className="text-sm font-black text-[#173654]">{amount}</p>
        <p className="mt-1 truncate text-[11px] font-semibold text-[#71879b]">
          {card.items
            .slice(0, 2)
            .map((item) => `${item.quantity}× ${item.productNameSnapshot}`)
            .join(" · ") || "Sin productos asociados"}
          {card.items.length > 2 ? ` · +${card.items.length - 2} productos` : ""}
        </p>
      </button>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[#71879b]">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${card.assignedSellerName ? "bg-[#f1f5f8]" : "bg-[#fff8ef] text-[#b56a1d]"}`}
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#173654] text-[8px] text-white">
            {(card.assignedSellerName ?? "S").slice(0, 1).toUpperCase()}
          </span>
          {card.assignedSellerName ?? "Sin responsable"}
        </span>
        <span
          className={`rounded-full px-2 py-1 ${card.overdue ? "bg-[#fff0ed] text-[#d75942]" : agingTone}`}
        >
          {card.overdue
            ? `Vencido${card.followUpAt ? ` · ${dateLabel(card.followUpAt, true)}` : ""}`
            : `Aging ${relativeAge(card.agingDays)}`}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#eef2f5] pt-2.5">
        <span className="min-w-0 truncate text-[10px] font-semibold text-[#7c91a4]">
          {card.nextAction ?? "Sin próxima acción"}
          {card.followUpAt && !card.overdue ? (
            <span className="ml-1 font-bold text-[#304b66]">
              · {dateLabel(card.followUpAt, true)}
            </span>
          ) : null}
        </span>
        {canManage ? (
          <label className="sr-only" htmlFor={`stage-${card.id}`}>
            Cambiar etapa de {card.customerName}
          </label>
        ) : null}
        {canManage ? (
          <select
            id={`stage-${card.id}`}
            value={card.stage}
            onChange={(event) => onMove(card, event.target.value as OpportunityStage)}
            className="max-w-[112px] rounded-md border border-[#dbe5ed] bg-white px-1.5 py-1 text-[10px] font-bold text-[#304b66] outline-none focus:border-[#2277ee]"
          >
            <option value={card.stage}>{pipelineStageLabels[card.stage]}</option>
            {stageChoices
              .filter((stage) => stage !== card.stage)
              .map((stage) => (
                <option key={stage} value={stage}>
                  {pipelineStageLabels[stage]}
                </option>
              ))}
          </select>
        ) : null}
      </div>
    </article>
  );
}

export function PipelineWorkspace({ board, queryString }: PipelineWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get("query") ?? "");
  const [moreFilters, setMoreFilters] = useState(false);
  const [mobileLane, setMobileLane] = useState(board.lanes[0]?.key ?? "NEW");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailTab, setDetailTab] = useState("Resumen");
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState<NewForm>(initialForm);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOptions, setCustomerOptions] = useState<
    Array<{ id: string; name: string; email: string | null; phone: string | null }>
  >([]);
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState<
    Array<{ id: string; sku: string; name: string }>
  >([]);
  const [filterCustomerSearch, setFilterCustomerSearch] = useState("");
  const [filterCustomerOptions, setFilterCustomerOptions] = useState<
    Array<{ id: string; name: string; email: string | null; phone: string | null }>
  >([]);
  const [filterProductSearch, setFilterProductSearch] = useState("");
  const [filterProductOptions, setFilterProductOptions] = useState<
    Array<{ id: string; sku: string; name: string }>
  >([]);
  const [stageDialog, setStageDialog] = useState<{
    card: PipelineCard;
    stage: OpportunityStage;
  } | null>(null);
  const [stageNote, setStageNote] = useState("");
  const [stageReason, setStageReason] = useState("");
  const [stageReasonCode, setStageReasonCode] = useState("");
  const [stageDate, setStageDate] = useState("");
  const [stageAction, setStageAction] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: "CALL" as ActivityType,
    subject: "",
    body: "",
    dueAt: "",
  });
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupForm, setFollowupForm] = useState({ title: "", dueAt: "" });
  const [followupEditOpen, setFollowupEditOpen] = useState(false);
  const [followupEditId, setFollowupEditId] = useState<string | null>(null);
  const [followupEditForm, setFollowupEditForm] = useState({ title: "", dueAt: "" });

  useEffect(() => {
    if (searchParams.get("open") !== "new") return;
    const presetCustomerId = searchParams.get("customerId");
    const timer = window.setTimeout(() => {
      setNewOpen(true);
      if (!presetCustomerId) return;
      setNewForm((form) => ({ ...form, customerId: presetCustomerId }));
      void fetch(`/api/admin/clientes/${encodeURIComponent(presetCustomerId)}?pageSize=1`, {
        cache: "no-store",
      })
        .then((response) => response.json())
        .then(
          (payload: {
            data?: { customer?: { name?: string | null } };
            customer?: { name?: string | null };
          }) => {
            const customer = payload.data?.customer ?? payload.customer;
            if (customer?.name)
              setNewForm((form) => ({
                ...form,
                customerId: presetCustomerId,
                customerName: customer.name ?? "",
              }));
          },
        )
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (customerSearch.trim().length < 2) return;
    const controller = new AbortController();
    void fetch(
      `/api/admin/clientes?query=${encodeURIComponent(customerSearch)}&page=1&pageSize=10`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then(
        (payload: {
          items?: Array<{ id: string; name: string; email: string | null; phone: string | null }>;
        }) => setCustomerOptions(payload.items ?? []),
      )
      .catch(() => undefined);
    return () => controller.abort();
  }, [customerSearch]);
  useEffect(() => {
    if (productSearch.trim().length < 2) return;
    const controller = new AbortController();
    void fetch(
      `/api/admin/catalogo?query=${encodeURIComponent(productSearch)}&page=1&pageSize=10`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then(
        (payload: {
          items?: Array<{ id: string; sku: string; name?: string; normalizedName?: string }>;
          rows?: Array<{ id: string; sku: string; name?: string; normalizedName?: string }>;
        }) =>
          setProductOptions(
            (payload.items ?? payload.rows ?? []).map((item) => ({
              id: item.id,
              sku: item.sku,
              name: item.name ?? item.normalizedName ?? item.sku,
            })),
          ),
      )
      .catch(() => undefined);
    return () => controller.abort();
  }, [productSearch]);
  useEffect(() => {
    if (filterCustomerSearch.trim().length < 2) return;
    const controller = new AbortController();
    void fetch(
      `/api/admin/clientes?query=${encodeURIComponent(filterCustomerSearch)}&page=1&pageSize=8`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then(
        (payload: {
          items?: Array<{ id: string; name: string; email: string | null; phone: string | null }>;
        }) => setFilterCustomerOptions(payload.items ?? []),
      )
      .catch(() => undefined);
    return () => controller.abort();
  }, [filterCustomerSearch]);
  useEffect(() => {
    if (filterProductSearch.trim().length < 2) return;
    const controller = new AbortController();
    void fetch(
      `/api/admin/catalogo?query=${encodeURIComponent(filterProductSearch)}&page=1&pageSize=8`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then(
        (payload: {
          items?: Array<{ id: string; sku: string; name?: string; normalizedName?: string }>;
          rows?: Array<{ id: string; sku: string; name?: string; normalizedName?: string }>;
        }) =>
          setFilterProductOptions(
            (payload.items ?? payload.rows ?? []).map((item) => ({
              id: item.id,
              sku: item.sku,
              name: item.name ?? item.normalizedName ?? item.sku,
            })),
          ),
      )
      .catch(() => undefined);
    return () => controller.abort();
  }, [filterProductSearch]);

  const activeFilterCount = [
    "stage",
    "sellerId",
    "origin",
    "currency",
    "customerId",
    "productId",
    "createdFrom",
    "createdTo",
    "overdue",
    "withoutNextAction",
    "withQuote",
    "withAmount",
  ].filter((key) => searchParams.has(key)).length;
  const selectedView = searchParams.get("view") ?? "pipeline";
  const presetCustomerId = searchParams.get("customerId");
  const filterableStages =
    selectedView === "closed"
      ? ["CLOSED", "LOST", "CANCELLED", "NO_RESPONSE"]
      : ["NEW", "CONTACTED", "QUOTING", "QUOTE_SENT", "FOLLOW_UP", "NEGOTIATION", "ACCEPTED"];
  const selectedSeller = board.facets.sellers.find(
    (seller) => seller.id === searchParams.get("sellerId"),
  );
  const filterChips = [
    searchParams.get("stage")
      ? {
          key: "stage",
          label:
            pipelineStageLabels[searchParams.get("stage") as OpportunityStage] ??
            searchParams.get("stage")!,
        }
      : null,
    selectedSeller
      ? {
          key: "sellerId",
          label: `Vendedor: ${selectedSeller.name ?? selectedSeller.email ?? selectedSeller.id}`,
        }
      : null,
    searchParams.get("origin")
      ? {
          key: "origin",
          label: `Origen: ${pipelineOriginLabels[searchParams.get("origin") as keyof typeof pipelineOriginLabels] ?? searchParams.get("origin")!}`,
        }
      : null,
    searchParams.get("currency")
      ? { key: "currency", label: `Moneda: ${searchParams.get("currency")}` }
      : null,
    searchParams.get("customerId") ? { key: "customerId", label: "Cliente seleccionado" } : null,
    searchParams.get("productId") ? { key: "productId", label: "Producto seleccionado" } : null,
    searchParams.get("overdue") === "true" ? { key: "overdue", label: "Vencidos" } : null,
    searchParams.get("withoutNextAction") === "true"
      ? { key: "withoutNextAction", label: "Sin siguiente acción" }
      : null,
    searchParams.get("withQuote") === "true" ? { key: "withQuote", label: "Con cotización" } : null,
    searchParams.get("withAmount") === "true" ? { key: "withAmount", label: "Con monto" } : null,
  ].filter((chip): chip is { key: string; label: string } => Boolean(chip));
  const visibleLanes = useMemo(
    () => (selectedView === "pipeline" ? board.lanes : []),
    [board.lanes, selectedView],
  );
  const allVisibleCards = visibleLanes.flatMap((lane) => lane.cards);

  function updateQuery(values: Record<string, string | null | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    next.delete("page");
    next.delete("lanePage");
    router.push(`${pathname}?${next.toString()}`);
  }
  function applySearch(event: FormEvent) {
    event.preventDefault();
    updateQuery({ query: searchInput.trim() || null });
  }
  function clearFilters() {
    router.push(pathname);
    setMoreFilters(false);
  }
  function openDetail(id: string) {
    setSelectedId(id);
    setDetail(null);
    setDetailTab("Resumen");
    void fetch(`/api/admin/oportunidades/${id}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: Detail) => setDetail(payload))
      .catch(() => setToast("No se pudo cargar el detalle."));
  }
  function refresh() {
    startTransition(() => router.refresh());
  }
  function requestMove(card: PipelineCard, stage: OpportunityStage) {
    if (!board.scope.canManage || stage === card.stage) return;
    if (stage === "SALE") {
      setToast("Las ventas se registran mediante conversión explícita.");
      return;
    }
    if (!canTransitionOpportunity(card.stage, stage)) {
      setToast(
        `No puedes mover de ${pipelineStageLabels[card.stage]} a ${pipelineStageLabels[stage]}.`,
      );
      return;
    }
    if (["FOLLOW_UP", "LOST", "CANCELLED"].includes(stage)) {
      setStageDialog({ card, stage });
      setStageNote("");
      setStageReason("");
      setStageReasonCode("");
      setStageDate(
        stage === "FOLLOW_UP" ? new Date(Date.now() + 86_400_000).toISOString().slice(0, 16) : "",
      );
      setStageAction(card.nextAction ?? "");
      return;
    }
    void patchStage(card.id, stage, {});
  }
  async function patchStage(
    id: string,
    stage: OpportunityStage,
    extras: Record<string, string | null>,
  ) {
    const response = await fetch(`/api/admin/oportunidades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, ...extras }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setToast(payload?.error?.message ?? "No se pudo actualizar la etapa.");
      return;
    }
    setStageDialog(null);
    setToast("Etapa actualizada.");
    refresh();
    if (selectedId === id) openDetail(id);
  }
  function onDragStart(event: DragEvent<HTMLElement>, card: PipelineCard) {
    event.dataTransfer.setData("text/plain", card.id);
    setDraggingId(card.id);
  }
  function onDrop(event: DragEvent<HTMLElement>, lane: PipelineBoardResponse["lanes"][number]) {
    event.preventDefault();
    setDraggingId(null);
    const id = event.dataTransfer.getData("text/plain");
    const card = allVisibleCards.find((item) => item.id === id);
    if (!card) return;
    const stage =
      lane.stages.find((candidate) => canTransitionOpportunity(card.stage, candidate)) ??
      lane.stages[0];
    if (stage) requestMove(card, stage);
  }

  async function submitNew(event: FormEvent) {
    event.preventDefault();
    if (!newForm.customerId) {
      setToast("Selecciona un cliente remoto antes de guardar.");
      return;
    }
    const response = await fetch("/api/admin/oportunidades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: newForm.customerId,
        title: newForm.title,
        origin: newForm.origin,
        assignedSellerId: newForm.sellerId || null,
        totalAmount: newForm.totalAmount || null,
        currency: newForm.currency,
        nextAction: newForm.nextAction || null,
        followUpAt: newForm.followUpAt ? new Date(newForm.followUpAt).toISOString() : null,
        notes: newForm.notes || null,
        items: newForm.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice || null,
          currency: newForm.currency,
        })),
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setToast(payload?.error?.message ?? "No se pudo crear la oportunidad.");
      return;
    }
    setNewOpen(false);
    setNewForm(initialForm);
    setCustomerSearch("");
    setProductSearch("");
    setToast("Oportunidad creada.");
    refresh();
  }
  async function submitActivity(event: FormEvent) {
    event.preventDefault();
    if (!detail || !activityForm.subject.trim()) return;
    const response = await fetch("/api/admin/actividades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opportunityId: detail.id,
        type: activityForm.type,
        subject: activityForm.subject,
        body: activityForm.body || null,
        dueAt: activityForm.dueAt ? new Date(activityForm.dueAt).toISOString() : null,
      }),
    });
    if (!response.ok) {
      setToast("No se pudo registrar la actividad.");
      return;
    }
    setActivityOpen(false);
    setActivityForm({ type: "CALL", subject: "", body: "", dueAt: "" });
    openDetail(detail.id);
    refresh();
  }
  async function submitFollowup(event: FormEvent) {
    event.preventDefault();
    if (!detail || !followupForm.title.trim() || !followupForm.dueAt) return;
    const response = await fetch(`/api/admin/oportunidades/${detail.id}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: followupForm.title,
        dueAt: new Date(followupForm.dueAt).toISOString(),
        assignedTo: detail.assignedSellerId,
      }),
    });
    if (!response.ok) {
      setToast("No se pudo crear el seguimiento.");
      return;
    }
    setFollowupOpen(false);
    setFollowupForm({ title: "", dueAt: "" });
    openDetail(detail.id);
    refresh();
  }
  async function updateFollowup(id: string, status: "COMPLETED" | "CANCELLED") {
    if (!detail) return;
    const response = await fetch(`/api/admin/oportunidades/${detail.id}/followups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setToast("No se pudo actualizar el seguimiento.");
      return;
    }
    openDetail(detail.id);
    refresh();
  }
  function editFollowup(item: Detail["followUps"][number]) {
    setFollowupEditId(item.id);
    setFollowupEditForm({
      title: item.title,
      dueAt: item.dueAt ? new Date(item.dueAt).toISOString().slice(0, 16) : "",
    });
    setFollowupEditOpen(true);
  }
  async function saveFollowupEdit(event: FormEvent) {
    event.preventDefault();
    if (!detail || !followupEditId || !followupEditForm.title.trim() || !followupEditForm.dueAt)
      return;
    const response = await fetch(
      `/api/admin/oportunidades/${detail.id}/followups/${followupEditId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: followupEditForm.title,
          dueAt: new Date(followupEditForm.dueAt).toISOString(),
        }),
      },
    );
    if (!response.ok) {
      setToast("No se pudo reprogramar el seguimiento.");
      return;
    }
    setFollowupEditOpen(false);
    openDetail(detail.id);
    refresh();
  }

  function tabClass(tab: string) {
    return `border-b-2 px-1 pb-3 text-xs font-extrabold ${detailTab === tab ? "border-[#2277ee] text-[#2277ee]" : "border-transparent text-[#7d91a5] hover:text-[#304b66]"}`;
  }
  const timeline = detail
    ? [
        ...detail.activities.map((item) => ({
          id: `activity-${item.id}`,
          type: item.type,
          subject: item.subject,
          body: item.body,
          actorName: item.actorName,
          createdAt: item.createdAt,
        })),
        ...detail.legacyActivities.map((item) => ({
          id: `legacy-${item.id}`,
          type: item.type,
          subject: item.subject,
          body: item.body,
          actorName: item.actorName,
          createdAt: item.createdAt,
        })),
        ...detail.stageHistory.map((item) => ({
          id: `stage-${item.id}`,
          type: "STAGE",
          subject: `${item.fromStage ? pipelineStageLabels[item.fromStage] : "Inicio"} → ${pipelineStageLabels[item.toStage]}`,
          body: item.note,
          actorName: item.actorName,
          createdAt: item.createdAt,
        })),
      ].sort(
        (a, b) =>
          (dateValue(b.createdAt)?.getTime() ?? 0) - (dateValue(a.createdAt)?.getTime() ?? 0),
      )
    : [];

  return (
    <section className="space-y-5 pb-10">
      <AdminDrawer
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Nueva oportunidad"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNewOpen(false)}
              className="rounded-lg border border-[#dbe5ed] px-4 py-2 text-xs font-extrabold text-[#71879b]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="new-opportunity-form"
              className="rounded-lg bg-[#2277ee] px-4 py-2 text-xs font-extrabold text-white"
            >
              Crear oportunidad
            </button>
          </div>
        }
      >
        <form id="new-opportunity-form" onSubmit={submitNew} className="space-y-4">
          <Field label="Cliente">
            {presetCustomerId && newForm.customerId === presetCustomerId ? (
              <div className="rounded-lg border border-[#dbe5ed] bg-[#f7fbff] px-3 py-3 text-xs font-extrabold text-[#304b66]">
                {newForm.customerName || "Cliente seleccionado"}
                <span className="mt-1 block text-[10px] font-semibold text-[#71879b]">
                  Cliente preseleccionado desde Customer 360
                </span>
              </div>
            ) : (
              <>
                <input
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  placeholder="Buscar por nombre, correo o teléfono"
                  className="field"
                />
                {customerOptions.length ? (
                  <div className="option-list">
                    {customerOptions.map((customer) => (
                      <button
                        type="button"
                        key={customer.id}
                        onClick={() => {
                          setNewForm((form) => ({
                            ...form,
                            customerId: customer.id,
                            customerName: customer.name,
                          }));
                          setCustomerSearch(customer.name);
                          setCustomerOptions([]);
                        }}
                        className="option-row"
                      >
                        <span>{customer.name}</span>
                        <small>{customer.email ?? customer.phone ?? ""}</small>
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
            {newForm.customerName ? (
              <p className="mt-1 text-[10px] font-bold text-[#35a673]">
                Cliente seleccionado: {newForm.customerName}
              </p>
            ) : null}
          </Field>
          <Field label="Título">
            <input
              required
              value={newForm.title}
              onChange={(event) => setNewForm((form) => ({ ...form, title: event.target.value }))}
              placeholder="Ej. Reposición de compresor"
              className="field"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Origen">
              <select
                value={newForm.origin}
                onChange={(event) =>
                  setNewForm((form) => ({ ...form, origin: event.target.value }))
                }
                className="field"
              >
                {opportunityOrigins.map((origin) => (
                  <option key={origin} value={origin}>
                    {pipelineOriginLabels[origin]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Moneda">
              <select
                value={newForm.currency}
                onChange={(event) =>
                  setNewForm((form) => ({ ...form, currency: event.target.value as "PEN" | "USD" }))
                }
                className="field"
              >
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
              </select>
            </Field>
          </div>
          <Field label="Valor estimado">
            <input
              value={newForm.totalAmount}
              onChange={(event) =>
                setNewForm((form) => ({ ...form, totalAmount: event.target.value }))
              }
              inputMode="decimal"
              placeholder="Opcional · se calcula desde productos con precio"
              className="field"
            />
          </Field>
          <Field label="Responsable">
            <select
              value={newForm.sellerId}
              onChange={(event) =>
                setNewForm((form) => ({ ...form, sellerId: event.target.value }))
              }
              className="field"
            >
              <option value="">Sin asignar</option>
              {board.facets.sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name ?? seller.email}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Productos">
            <input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Buscar SKU, nombre o familia"
              className="field"
            />
            {productOptions.length ? (
              <div className="option-list">
                {productOptions.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => {
                      if (newForm.items.some((item) => item.productId === product.id)) return;
                      setNewForm((form) => ({
                        ...form,
                        items: [
                          ...form.items,
                          {
                            productId: product.id,
                            sku: product.sku,
                            name: product.name,
                            quantity: 1,
                            unitPrice: "",
                          },
                        ],
                      }));
                      setProductSearch("");
                      setProductOptions([]);
                    }}
                    className="option-row"
                  >
                    <span>{product.name}</span>
                    <small>{product.sku}</small>
                  </button>
                ))}
              </div>
            ) : null}
            {newForm.items.map((item, index) => (
              <div
                key={item.productId}
                className="mt-2 grid grid-cols-[minmax(0,1fr)_52px_82px_24px] items-center gap-1.5 rounded-lg bg-[#f5f8fb] p-2"
              >
                <span className="truncate text-[10px] font-bold text-[#304b66]">
                  {item.sku} · {item.name}
                </span>
                <input
                  aria-label={`Cantidad de ${item.name}`}
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(event) =>
                    setNewForm((form) => ({
                      ...form,
                      items: form.items.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, quantity: Math.max(1, Number(event.target.value)) }
                          : row,
                      ),
                    }))
                  }
                  className="field px-1 text-center"
                />
                <input
                  aria-label={`Precio unitario de ${item.name}`}
                  inputMode="decimal"
                  value={item.unitPrice}
                  onChange={(event) =>
                    setNewForm((form) => ({
                      ...form,
                      items: form.items.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, unitPrice: event.target.value } : row,
                      ),
                    }))
                  }
                  placeholder="Precio"
                  className="field px-1"
                />
                <button
                  type="button"
                  aria-label={`Quitar ${item.name}`}
                  onClick={() =>
                    setNewForm((form) => ({
                      ...form,
                      items: form.items.filter((_, rowIndex) => rowIndex !== index),
                    }))
                  }
                  className="text-[#b74d3b]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {newForm.items.length ? (
              <p className="mt-2 text-right text-xs font-black text-[#173654]">
                Total calculado:{" "}
                {money(
                  newForm.items.reduce(
                    (sum, item) => sum + (Number(item.unitPrice) || 0) * item.quantity,
                    0,
                  ),
                  newForm.currency,
                )}
              </p>
            ) : null}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Próxima acción">
              <input
                value={newForm.nextAction}
                onChange={(event) =>
                  setNewForm((form) => ({ ...form, nextAction: event.target.value }))
                }
                className="field"
                placeholder="Ej. Llamar para validar modelo"
              />
            </Field>
            <Field label="Fecha de seguimiento">
              <input
                type="datetime-local"
                value={newForm.followUpAt}
                onChange={(event) =>
                  setNewForm((form) => ({ ...form, followUpAt: event.target.value }))
                }
                className="field"
              />
            </Field>
          </div>
          <Field label="Notas">
            <textarea
              value={newForm.notes}
              onChange={(event) => setNewForm((form) => ({ ...form, notes: event.target.value }))}
              className="field min-h-20 py-2"
            />
          </Field>
        </form>
      </AdminDrawer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2277ee]">
            Pipeline
          </p>
          <h1 className="mt-1 text-[25px] font-black tracking-[-0.045em] text-[#102a43] sm:text-[28px]">
            Pipeline de oportunidades
          </h1>
          <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-[#7d91a5]">
            Gestiona y da seguimiento a tus oportunidades comerciales.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={
              board.scope.canExport ? `/api/admin/oportunidades/export?${queryString}` : undefined
            }
            aria-disabled={!board.scope.canExport}
            className={`inline-flex h-9 items-center gap-2 rounded-lg border border-[#dbe5ed] bg-white px-3 text-[11px] font-extrabold text-[#304b66] shadow-sm ${!board.scope.canExport ? "pointer-events-none opacity-45" : "hover:bg-[#f7fafc]"}`}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
          </a>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            disabled={!board.scope.canManage}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#ff830e] px-3.5 text-[11px] font-extrabold text-white shadow-[0_5px_14px_rgba(255,131,14,0.18)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva oportunidad
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Oportunidades activas"
          value={board.metrics.activeOpportunities}
          helper={`${board.metrics.unassigned} sin responsable · ${board.metrics.withoutNextAction} sin próxima acción`}
          icon={<UsersRound className="h-4 w-4" />}
          onClick={() => updateQuery({ view: null })}
        />
        <MetricCard
          label="Valor del pipeline"
          value={
            <span className="text-[16px] leading-5 sm:text-[20px]">
              {amountList(board.metrics.amountByCurrency)}
            </span>
          }
          helper="Monedas separadas, sin consolidar"
          icon={<Tag className="h-4 w-4" />}
          tone="purple"
          onClick={() => updateQuery({ withAmount: "true", view: null })}
        />
        <MetricCard
          label="Seguimientos vencidos"
          value={board.metrics.overdueFollowUps}
          helper={`${board.metrics.stale} oportunidades sin contacto reciente`}
          icon={<AlertCircle className="h-4 w-4" />}
          tone="orange"
          tooltip="Se calcula con seguimientos pendientes y su fecha de vencimiento."
          onClick={() => updateQuery({ view: "followups", overdue: "true" })}
        />
        <MetricCard
          label="Tasa de cierre"
          value={board.metrics.closeRate == null ? "N/D" : `${board.metrics.closeRate.toFixed(1)}%`}
          helper="Cerradas / (Cerradas + Perdidas + Canceladas)"
          icon={<Check className="h-4 w-4" />}
          tone="green"
          onClick={() => updateQuery({ view: "closed" })}
        />
      </div>
      <div className="rounded-xl border border-[#e1e9f0] bg-white px-4 pt-4 shadow-[0_2px_8px_rgba(16,42,67,0.04)] sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={applySearch} className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91a4b5]" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar código, cliente, correo, producto o SKU"
              className="h-9 w-full rounded-lg border border-[#dbe5ed] bg-[#fbfdff] pl-9 pr-3 text-xs font-semibold text-[#304b66] outline-none focus:border-[#2277ee]"
            />
          </form>
          <select
            aria-label="Filtrar por etapa"
            value={searchParams.get("stage") ?? ""}
            onChange={(event) => updateQuery({ stage: event.target.value || null })}
            className="h-9 rounded-lg border border-[#dbe5ed] bg-white px-2 text-[11px] font-bold text-[#304b66]"
          >
            <option value="">Todas las etapas</option>
            {filterableStages.map((stage) => (
              <option key={stage} value={stage}>
                {pipelineStageLabels[stage as OpportunityStage]}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por vendedor"
            value={searchParams.get("sellerId") ?? ""}
            onChange={(event) => updateQuery({ sellerId: event.target.value || null })}
            className="h-9 max-w-[180px] rounded-lg border border-[#dbe5ed] bg-white px-2 text-[11px] font-bold text-[#304b66]"
          >
            <option value="">Todos los vendedores</option>
            {board.facets.sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name ?? seller.email ?? seller.id}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setMoreFilters((value) => !value)}
            className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-extrabold ${moreFilters || activeFilterCount ? "border-[#2277ee] bg-[#f2f7ff] text-[#2277ee]" : "border-[#dbe5ed] text-[#304b66]"}`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Más filtros
            {activeFilterCount ? (
              <span className="rounded-full bg-[#2277ee] px-1.5 py-0.5 text-[9px] text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
        {moreFilters ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#edf2f5] pt-3 sm:grid-cols-4">
              <select
                aria-label="Filtrar por origen"
                value={searchParams.get("origin") ?? ""}
                onChange={(event) => updateQuery({ origin: event.target.value || null })}
                className="h-9 rounded-lg border border-[#dbe5ed] px-2 text-[11px] font-bold text-[#304b66]"
              >
                <option value="">Todos los orígenes</option>
                {opportunityOrigins.map((origin) => (
                  <option key={origin} value={origin}>
                    {pipelineOriginLabels[origin]}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar por moneda"
                value={searchParams.get("currency") ?? ""}
                onChange={(event) => updateQuery({ currency: event.target.value || null })}
                className="h-9 rounded-lg border border-[#dbe5ed] px-2 text-[11px] font-bold text-[#304b66]"
              >
                <option value="">Todas las monedas</option>
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
              </select>
              <label className="flex h-9 items-center gap-2 rounded-lg border border-[#dbe5ed] px-2 text-[11px] font-bold text-[#304b66]">
                <input
                  type="checkbox"
                  checked={searchParams.get("overdue") === "true"}
                  onChange={(event) =>
                    updateQuery({ overdue: event.target.checked ? "true" : null })
                  }
                />
                Vencidos
              </label>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#dbe5ed] text-[11px] font-extrabold text-[#71879b] hover:bg-[#f7fafc]"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Limpiar filtros
              </button>
              <div className="relative sm:col-span-2">
                <input
                  aria-label="Filtrar por cliente"
                  value={filterCustomerSearch}
                  onChange={(event) => setFilterCustomerSearch(event.target.value)}
                  placeholder={
                    searchParams.get("customerId")
                      ? "Cliente seleccionado"
                      : "Cliente: buscar nombre, correo o teléfono"
                  }
                  className="field h-9"
                />
                {filterCustomerSearch.trim().length >= 2 && filterCustomerOptions.length ? (
                  <div className="option-list absolute inset-x-0 top-10 z-30">
                    {filterCustomerOptions.map((customer) => (
                      <button
                        type="button"
                        key={customer.id}
                        onClick={() => {
                          updateQuery({ customerId: customer.id });
                          setFilterCustomerSearch(customer.name);
                          setFilterCustomerOptions([]);
                        }}
                        className="option-row"
                      >
                        <span>{customer.name}</span>
                        <small>{customer.email ?? customer.phone ?? ""}</small>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="relative sm:col-span-2">
                <input
                  aria-label="Filtrar por producto"
                  value={filterProductSearch}
                  onChange={(event) => setFilterProductSearch(event.target.value)}
                  placeholder={
                    searchParams.get("productId")
                      ? "Producto seleccionado"
                      : "Producto: buscar SKU, nombre o familia"
                  }
                  className="field h-9"
                />
                {filterProductSearch.trim().length >= 2 && filterProductOptions.length ? (
                  <div className="option-list absolute inset-x-0 top-10 z-30">
                    {filterProductOptions.map((product) => (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() => {
                          updateQuery({ productId: product.id });
                          setFilterProductSearch(product.sku);
                          setFilterProductOptions([]);
                        }}
                        className="option-row"
                      >
                        <span>{product.name}</span>
                        <small>{product.sku}</small>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <label className="grid gap-1 text-[10px] font-extrabold text-[#304b66]">
                Creada desde
                <input
                  type="date"
                  aria-label="Creada desde"
                  value={searchParams.get("createdFrom") ?? ""}
                  onChange={(event) => updateQuery({ createdFrom: event.target.value || null })}
                  className="field h-9"
                />
              </label>
              <label className="grid gap-1 text-[10px] font-extrabold text-[#304b66]">
                Creada hasta
                <input
                  type="date"
                  aria-label="Creada hasta"
                  value={searchParams.get("createdTo") ?? ""}
                  onChange={(event) => updateQuery({ createdTo: event.target.value || null })}
                  className="field h-9"
                />
              </label>
              <label className="grid gap-1 text-[10px] font-extrabold text-[#304b66]">
                Seguimiento desde
                <input
                  type="date"
                  aria-label="Seguimiento desde"
                  value={searchParams.get("followUpFrom") ?? ""}
                  onChange={(event) => updateQuery({ followUpFrom: event.target.value || null })}
                  className="field h-9"
                />
              </label>
              <label className="grid gap-1 text-[10px] font-extrabold text-[#304b66]">
                Seguimiento hasta
                <input
                  type="date"
                  aria-label="Seguimiento hasta"
                  value={searchParams.get("followUpTo") ?? ""}
                  onChange={(event) => updateQuery({ followUpTo: event.target.value || null })}
                  className="field h-9"
                />
              </label>
              <label className="flex h-9 items-center gap-2 rounded-lg border border-[#dbe5ed] px-2 text-[10px] font-bold text-[#304b66]">
                <input
                  type="checkbox"
                  checked={searchParams.get("withoutNextAction") === "true"}
                  onChange={(event) =>
                    updateQuery({ withoutNextAction: event.target.checked ? "true" : null })
                  }
                />
                Sin siguiente acción
              </label>
              <select
                aria-label="Filtrar por cotización"
                value={searchParams.get("withQuote") ?? ""}
                onChange={(event) => updateQuery({ withQuote: event.target.value || null })}
                className="field h-9"
              >
                <option value="">Cotización: todas</option>
                <option value="true">Con cotización</option>
                <option value="false">Sin cotización</option>
              </select>
              <select
                aria-label="Filtrar por monto"
                value={searchParams.get("withAmount") ?? ""}
                onChange={(event) => updateQuery({ withAmount: event.target.value || null })}
                className="field h-9"
              >
                <option value="">Monto: todos</option>
                <option value="true">Con monto</option>
                <option value="false">Sin monto</option>
              </select>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-[#6f8498]">
              {filterChips.map((chip) => (
                <button
                  type="button"
                  key={chip.key}
                  onClick={() => updateQuery({ [chip.key]: null })}
                  className="inline-flex items-center gap-1 rounded-full border border-[#cfe0ef] bg-[#f7fbff] px-2.5 py-1.5 text-[#2277ee] hover:border-[#2277ee]"
                >
                  {chip.label} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          </>
        ) : null}
        <div className="mt-4 flex items-center gap-5 overflow-x-auto border-b border-[#e5edf2] text-nowrap">
          <button
            type="button"
            onClick={() => updateQuery({ view: null })}
            className={`border-b-2 px-1 pb-3 text-xs font-extrabold ${selectedView === "pipeline" ? "border-[#2277ee] text-[#2277ee]" : "border-transparent text-[#7d91a5]"}`}
          >
            Pipeline
          </button>
          <button
            type="button"
            onClick={() => updateQuery({ view: "followups" })}
            className={`border-b-2 px-1 pb-3 text-xs font-extrabold ${selectedView === "followups" ? "border-[#2277ee] text-[#2277ee]" : "border-transparent text-[#7d91a5]"}`}
          >
            Seguimientos
            {board.metrics.overdueFollowUps ? (
              <span className="ml-1 rounded-full bg-[#fff0ed] px-1.5 py-0.5 text-[9px] text-[#d75942]">
                {board.metrics.overdueFollowUps}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => updateQuery({ view: "closed" })}
            className={`border-b-2 px-1 pb-3 text-xs font-extrabold ${selectedView === "closed" ? "border-[#2277ee] text-[#2277ee]" : "border-transparent text-[#7d91a5]"}`}
          >
            Cerradas
          </button>
        </div>
      </div>
      {selectedView === "pipeline" ? (
        <>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:hidden">
            {board.lanes.map((lane) => (
              <button
                key={lane.key}
                type="button"
                onClick={() => setMobileLane(lane.key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-extrabold ${mobileLane === lane.key ? "border-[#2277ee] bg-[#2277ee] text-white" : "border-[#dbe5ed] bg-white text-[#71879b]"}`}
              >
                {lane.label} <span className="ml-1 opacity-70">{lane.total}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 snap-x">
            <div className="flex min-w-max gap-3">
              {visibleLanes.map((lane) => {
                const tone = laneTone[lane.key] ?? laneTone.NEW;
                const mobileHidden = mobileLane !== lane.key;
                return (
                  <section
                    key={lane.key}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => onDrop(event, lane)}
                    className={`${mobileHidden ? "hidden md:block" : "block"} w-[285px] shrink-0 snap-start rounded-xl border bg-[#f8fafc] p-2.5 transition md:w-[270px] xl:w-[285px] ${
                      draggingId
                        ? lane.stages.some((stage) => {
                            const dragged = allVisibleCards.find((card) => card.id === draggingId);
                            return dragged ? canTransitionOpportunity(dragged.stage, stage) : false;
                          })
                          ? "border-[#2277ee] ring-2 ring-[#2277ee]/10"
                          : "border-[#e1e9f0] opacity-55"
                        : "border-[#e1e9f0]"
                    }`}
                  >
                    <div
                      className={`mb-2 rounded-lg border-l-4 ${tone.border} ${tone.wash} px-3 py-2.5`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-[#304b66]">
                          <span
                            className={`mr-1.5 inline-block h-2 w-2 rounded-full ${tone.dot}`}
                          />
                          {lane.label}
                        </h2>
                        <span className="text-xs font-black text-[#173654]">{lane.total}</span>
                      </div>
                      <p className="mt-1 text-[10px] font-bold text-[#71879b]">
                        {amountList(lane.amountByCurrency)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {lane.cards.map((card) => (
                        <Card
                          key={card.id}
                          card={card}
                          canManage={board.scope.canManage}
                          onOpen={openDetail}
                          onMove={requestMove}
                          onDragStart={onDragStart}
                          onDragEnd={() => setDraggingId(null)}
                        />
                      ))}
                      {lane.hasMore ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateQuery({ lane: lane.key, lanePage: String(lane.page + 1) })
                          }
                          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#cbd9e4] py-2 text-[10px] font-extrabold text-[#71879b] hover:bg-white"
                        >
                          Cargar más <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      {!lane.cards.length ? (
                        <p className="rounded-lg border border-dashed border-[#d5e0e8] px-3 py-6 text-center text-[11px] font-semibold text-[#8ba0b2]">
                          No hay oportunidades aquí.
                        </p>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
      {selectedView === "followups" ? (
        <FollowupsView followups={board.followUps} onOpen={openDetail} />
      ) : null}
      {selectedView === "closed" ? <ClosedView cards={board.closed} onOpen={openDetail} /> : null}
      {isPending ? (
        <div className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-[#173654] px-3 py-2 text-[11px] font-bold text-white shadow-lg">
          <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
          Actualizando…
        </div>
      ) : null}
      {toast ? (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-[70] flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg bg-[#173654] px-4 py-3 text-xs font-bold text-white shadow-xl"
        >
          <span>{toast}</span>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setToast(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <AdminDrawer
        open={Boolean(selectedId)}
        onClose={() => {
          setSelectedId(null);
          setDetail(null);
        }}
        title={detail ? `${detail.code} · ${detail.customerName}` : "Cargando oportunidad…"}
        footer={
          detail && board.scope.canManage ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActivityOpen(true)}
                className="flex-1 rounded-lg border border-[#dbe5ed] px-3 py-2 text-[11px] font-extrabold text-[#304b66]"
              >
                Registrar actividad
              </button>
              <button
                type="button"
                onClick={() => setFollowupOpen(true)}
                className="flex-1 rounded-lg bg-[#2277ee] px-3 py-2 text-[11px] font-extrabold text-white"
              >
                Nuevo seguimiento
              </button>
            </div>
          ) : null
        }
      >
        {detail ? (
          <div className="space-y-5">
            <div className="rounded-xl bg-[#f5f8fb] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7e94a7]">
                    {pipelineStageLabels[detail.stage]}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-[#173654]">{detail.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-[#71879b]">
                    {detail.customerEmail ?? "Sin correo"} ·{" "}
                    {detail.customerPhone ?? "Sin teléfono"}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#2277ee]">
                  {detail.origin}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#8aa0b2]">Monto</p>
                  <p className="mt-1 font-black text-[#173654]">
                    {money(detail.totalAmount, detail.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#8aa0b2]">Aging</p>
                  <p className="mt-1 font-black text-[#173654]">{relativeAge(detail.agingDays)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#8aa0b2]">Responsable</p>
                  <p className="mt-1 font-black text-[#173654]">
                    {detail.assignedSellerName ?? "Sin asignar"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#8aa0b2]">Próxima acción</p>
                  <p className="mt-1 font-black text-[#173654]">
                    {detail.nextAction ?? "Sin definir"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#8aa0b2]">
                    Próximo seguimiento
                  </p>
                  <p className="mt-1 font-black text-[#173654]">
                    {dateLabel(detail.followUpAt, true)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto border-b border-[#e5edf2]">
              {[
                "Resumen",
                "Productos",
                "Actividad",
                "Seguimientos",
                "Cotizaciones",
                "Historial",
              ].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setDetailTab(tab)}
                  className={tabClass(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            {detailTab === "Resumen" ? (
              <div className="space-y-3 text-xs text-[#536d83]">
                <p>{detail.notes ?? "Sin notas registradas."}</p>
                {detail.lostReason ? (
                  <p className="rounded-lg bg-[#fff3f0] p-3 font-semibold text-[#b74d3b]">
                    Motivo de cierre: {detail.lostReason}
                  </p>
                ) : null}
                <div className="rounded-lg border border-[#e2eaf1] p-3">
                  <p className="font-black text-[#304b66]">Contacto más reciente</p>
                  <p className="mt-1 font-semibold">{dateLabel(detail.lastContactAt, true)}</p>
                </div>
                {detail.customerPhone || detail.customerEmail ? (
                  <div className="flex flex-wrap gap-2">
                    {whatsappHref(detail.customerPhone) ? (
                      <a
                        href={whatsappHref(detail.customerPhone)!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfeedd] bg-[#effbf4] px-3 py-2 text-[10px] font-extrabold text-[#25885e]"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    ) : null}
                    {detail.customerPhone ? (
                      <a
                        href={`tel:${detail.customerPhone}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe5ed] px-3 py-2 text-[10px] font-extrabold text-[#304b66]"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Llamar
                      </a>
                    ) : null}
                    {detail.customerEmail ? (
                      <a
                        href={`mailto:${detail.customerEmail}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbe5ed] px-3 py-2 text-[10px] font-extrabold text-[#304b66]"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            {detailTab === "Productos" ? (
              <div className="space-y-2">
                {detail.items.length ? (
                  detail.items.map((item) => (
                    <div key={item.id} className="rounded-lg border border-[#e2eaf1] p-3">
                      <div className="flex justify-between gap-2">
                        <p className="text-xs font-black text-[#304b66]">
                          {item.productNameSnapshot}
                        </p>
                        <span className="text-[10px] font-bold text-[#71879b]">
                          ×{item.quantity}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] font-semibold text-[#8195a7]">
                        {item.skuSnapshot} · {money(item.lineTotal, detail.currency)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-semibold text-[#8195a7]">Sin productos.</p>
                )}
              </div>
            ) : null}
            {detailTab === "Actividad" ? <Timeline items={timeline} /> : null}
            {detailTab === "Seguimientos" ? (
              <div className="space-y-2">
                {detail.followUps.length ? (
                  detail.followUps.map((item) => (
                    <div key={item.id} className="rounded-lg border border-[#e2eaf1] p-3">
                      <div className="flex justify-between gap-2">
                        <div>
                          <p className="text-xs font-black text-[#304b66]">{item.title}</p>
                          <p className="mt-1 text-[10px] font-semibold text-[#8195a7]">
                            {dateLabel(item.dueAt, true)} · {item.assignedToName ?? "Sin asignar"}
                          </p>
                        </div>
                        <span className="text-[10px] font-black text-[#71879b]">{item.status}</span>
                      </div>
                      {item.status === "PENDING" ? (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateFollowup(item.id, "COMPLETED")}
                            className="rounded-md bg-[#e9f8f0] px-2 py-1 text-[10px] font-black text-[#2f9064]"
                          >
                            Completar
                          </button>
                          <button
                            type="button"
                            onClick={() => updateFollowup(item.id, "CANCELLED")}
                            className="rounded-md bg-[#fff3f0] px-2 py-1 text-[10px] font-black text-[#b74d3b]"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => editFollowup(item)}
                            className="rounded-md bg-[#eef6ff] px-2 py-1 text-[10px] font-black text-[#2277ee]"
                          >
                            Reprogramar
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-semibold text-[#8195a7]">No hay seguimientos.</p>
                )}
              </div>
            ) : null}
            {detailTab === "Cotizaciones" ? (
              <div className="rounded-lg border border-[#e2eaf1] p-3 text-xs font-semibold text-[#536d83]">
                {detail.quoteId ? (
                  <a
                    href={`/admin/cotizaciones?query=${encodeURIComponent(detail.quoteId)}`}
                    className="font-black text-[#2277ee]"
                  >
                    Abrir cotización {detail.quoteId}
                  </a>
                ) : (
                  <a
                    href={`/admin/cotizaciones?opportunityId=${encodeURIComponent(detail.id)}`}
                    className="font-black text-[#2277ee]"
                  >
                    Crear cotización desde esta oportunidad
                  </a>
                )}
              </div>
            ) : null}
            {detailTab === "Historial" ? (
              <Timeline
                items={detail.stageHistory.map((item) => ({
                  id: item.id,
                  type: "STAGE",
                  subject: `${item.fromStage ? pipelineStageLabels[item.fromStage] : "Inicio"} → ${pipelineStageLabels[item.toStage]}`,
                  body: item.note,
                  actorName: item.actorName,
                  createdAt: item.createdAt,
                }))}
              />
            ) : null}
          </div>
        ) : (
          <div className="flex items-center justify-center py-16">
            <RefreshCcw className="h-5 w-5 animate-spin text-[#2277ee]" />
          </div>
        )}
      </AdminDrawer>

      {stageDialog ? (
        <Modal
          title={`Mover a ${pipelineStageLabels[stageDialog.stage]}`}
          onClose={() => setStageDialog(null)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void patchStage(stageDialog.card.id, stageDialog.stage, {
                note: stageNote || null,
                followUpAt:
                  stageDialog.stage === "FOLLOW_UP" ? new Date(stageDate).toISOString() : null,
                nextAction: stageDialog.stage === "FOLLOW_UP" ? stageAction : null,
                lostReason:
                  stageDialog.stage === "LOST"
                    ? [stageReasonCode, stageReason.trim()].filter(Boolean).join(": ")
                    : null,
                cancellationReason: stageDialog.stage === "CANCELLED" ? stageReason : null,
              });
            }}
            className="space-y-3"
          >
            <p className="text-xs font-semibold text-[#71879b]">
              {stageDialog.card.customerName} · {stageDialog.card.code}
            </p>
            {stageDialog.stage === "FOLLOW_UP" ? (
              <>
                <Field label="Próxima acción">
                  <input
                    required
                    value={stageAction}
                    onChange={(event) => setStageAction(event.target.value)}
                    className="field"
                  />
                </Field>
                <Field label="Fecha">
                  <input
                    required
                    type="datetime-local"
                    value={stageDate}
                    onChange={(event) => setStageDate(event.target.value)}
                    className="field"
                  />
                </Field>
                <Field label="Nota">
                  <textarea
                    required
                    value={stageNote}
                    onChange={(event) => setStageNote(event.target.value)}
                    className="field min-h-20 py-2"
                  />
                </Field>
              </>
            ) : stageDialog.stage === "LOST" ? (
              <>
                <Field label="Motivo de pérdida">
                  <select
                    required
                    value={stageReasonCode}
                    onChange={(event) => setStageReasonCode(event.target.value)}
                    className="field"
                  >
                    <option value="">Selecciona un motivo</option>
                    {lostReasonOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Detalle">
                  <textarea
                    required={stageReasonCode === "OTHER"}
                    value={stageReason}
                    onChange={(event) => setStageReason(event.target.value)}
                    className="field min-h-20 py-2"
                    placeholder="Contexto adicional (opcional)"
                  />
                </Field>
              </>
            ) : (
              <Field label="Motivo de cancelación">
                <textarea
                  required
                  value={stageReason}
                  onChange={(event) => setStageReason(event.target.value)}
                  className="field min-h-24 py-2"
                />
              </Field>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-[#2277ee] px-4 py-2.5 text-xs font-extrabold text-white"
            >
              Confirmar cambio
            </button>
          </form>
        </Modal>
      ) : null}
      {activityOpen ? (
        <Modal title="Registrar actividad" onClose={() => setActivityOpen(false)}>
          <form onSubmit={submitActivity} className="space-y-3">
            <Field label="Tipo">
              <select
                value={activityForm.type}
                onChange={(event) =>
                  setActivityForm((form) => ({ ...form, type: event.target.value as ActivityType }))
                }
                className="field"
              >
                <option value="CALL">Llamada</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Correo</option>
                <option value="MEETING">Reunión</option>
                <option value="NOTE">Nota</option>
              </select>
            </Field>
            <Field label="Asunto">
              <input
                required
                value={activityForm.subject}
                onChange={(event) =>
                  setActivityForm((form) => ({ ...form, subject: event.target.value }))
                }
                className="field"
              />
            </Field>
            <Field label="Detalle">
              <textarea
                value={activityForm.body}
                onChange={(event) =>
                  setActivityForm((form) => ({ ...form, body: event.target.value }))
                }
                className="field min-h-24 py-2"
              />
            </Field>
            <Field label="Fecha y hora">
              <input
                type="datetime-local"
                value={activityForm.dueAt}
                onChange={(event) =>
                  setActivityForm((form) => ({ ...form, dueAt: event.target.value }))
                }
                className="field"
              />
            </Field>
            <button
              type="submit"
              className="w-full rounded-lg bg-[#2277ee] px-4 py-2.5 text-xs font-extrabold text-white"
            >
              Guardar actividad
            </button>
          </form>
        </Modal>
      ) : null}
      {followupOpen ? (
        <Modal title="Nuevo seguimiento" onClose={() => setFollowupOpen(false)}>
          <form onSubmit={submitFollowup} className="space-y-3">
            <Field label="Acción">
              <input
                required
                value={followupForm.title}
                onChange={(event) =>
                  setFollowupForm((form) => ({ ...form, title: event.target.value }))
                }
                className="field"
              />
            </Field>
            <Field label="Fecha">
              <input
                required
                type="datetime-local"
                value={followupForm.dueAt}
                onChange={(event) =>
                  setFollowupForm((form) => ({ ...form, dueAt: event.target.value }))
                }
                className="field"
              />
            </Field>
            <button
              type="submit"
              className="w-full rounded-lg bg-[#2277ee] px-4 py-2.5 text-xs font-extrabold text-white"
            >
              Crear seguimiento
            </button>
          </form>
        </Modal>
      ) : null}
      {followupEditOpen ? (
        <Modal title="Reprogramar seguimiento" onClose={() => setFollowupEditOpen(false)}>
          <form onSubmit={saveFollowupEdit} className="space-y-3">
            <Field label="Acción">
              <input
                required
                value={followupEditForm.title}
                onChange={(event) =>
                  setFollowupEditForm((form) => ({ ...form, title: event.target.value }))
                }
                className="field"
              />
            </Field>
            <Field label="Nueva fecha">
              <input
                required
                type="datetime-local"
                value={followupEditForm.dueAt}
                onChange={(event) =>
                  setFollowupEditForm((form) => ({ ...form, dueAt: event.target.value }))
                }
                className="field"
              />
            </Field>
            <button
              type="submit"
              className="w-full rounded-lg bg-[#2277ee] px-4 py-2.5 text-xs font-extrabold text-white"
            >
              Guardar nueva fecha
            </button>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}

function FollowupsView({
  followups,
  onOpen,
}: {
  followups: PipelineFollowUpItem[];
  onOpen: (id: string) => void;
}) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  const groups = [
    { key: "overdue", label: "Vencidos", items: followups.filter((item) => item.overdue) },
    {
      key: "today",
      label: "Hoy",
      items: followups.filter((item) => !item.overdue && item.dueAt < tomorrow),
    },
    {
      key: "upcoming",
      label: "Próximos",
      items: followups.filter((item) => !item.overdue && item.dueAt >= tomorrow),
    },
  ].filter((group) => group.items.length);
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key}>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-xs font-black uppercase tracking-[0.1em] text-[#304b66]">
              {group.label}
            </h2>
            <span className="rounded-full bg-[#f1f5f8] px-2 py-0.5 text-[10px] font-black text-[#71879b]">
              {group.items.length}
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {group.items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onOpen(item.opportunityId)}
                className="rounded-xl border border-[#e1e9f0] bg-white p-4 text-left shadow-sm hover:border-[#bcd3eb]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#173654]">{item.title}</p>
                    <p className="mt-1 text-xs font-semibold text-[#71879b]">
                      {item.opportunityCode} · {item.customerName}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black ${item.overdue ? "bg-[#fff0ed] text-[#d75942]" : "bg-[#eef6ff] text-[#2277ee]"}`}
                  >
                    {item.overdue ? "Vencido" : "Pendiente"}
                  </span>
                </div>
                <p className="mt-3 text-xs font-bold text-[#304b66]">
                  {dateLabel(item.dueAt, true)} · {item.assignedToName ?? "Sin asignar"}
                </p>
              </button>
            ))}
          </div>
        </section>
      ))}
      {!followups.length ? (
        <EmptyState text="Todo al día. No tienes seguimientos pendientes." />
      ) : null}
    </div>
  );
}
function ClosedView({ cards, onOpen }: { cards: PipelineCard[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <button
          type="button"
          key={card.id}
          onClick={() => onOpen(card.id)}
          className="rounded-xl border border-[#e1e9f0] bg-white p-4 text-left shadow-sm hover:border-[#bcd3eb]"
        >
          <div className="flex justify-between gap-2">
            <p className="text-sm font-black text-[#173654]">{card.customerName}</p>
            <span className="rounded-full bg-[#f1f5f8] px-2 py-1 text-[10px] font-black text-[#71879b]">
              {pipelineStageLabels[card.stage]}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-[#71879b]">
            {card.code} · {card.title}
          </p>
          <p className="mt-3 text-sm font-black text-[#304b66]">
            {money(card.totalAmount, card.currency)}
          </p>
          <p className="mt-2 text-[11px] font-semibold text-[#b74d3b]">
            {card.nextAction ?? "Sin motivo registrado"}
          </p>
        </button>
      ))}
      {!cards.length ? (
        <EmptyState text="No hay oportunidades cerradas con estos filtros." />
      ) : null}
    </div>
  );
}
function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full rounded-xl border border-dashed border-[#cfdae3] bg-white px-5 py-14 text-center text-xs font-semibold text-[#8195a7]">
      <CalendarClock className="mx-auto mb-2 h-5 w-5 text-[#9db0bf]" />
      {text}
    </div>
  );
}
function Timeline({
  items,
}: {
  items: Array<{
    id: string;
    type: string;
    subject: string;
    body: string | null;
    actorName: string;
    createdAt: BoardDate;
  }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="relative border-l-2 border-[#dce8f2] pl-4">
          <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-[#2277ee]" />
          <p className="text-xs font-black text-[#304b66]">{item.subject}</p>
          <p className="mt-1 text-[10px] font-semibold text-[#8195a7]">
            {item.type} · {item.actorName} · {dateLabel(item.createdAt, true)}
          </p>
          {item.body ? <p className="mt-2 text-xs leading-5 text-[#536d83]">{item.body}</p> : null}
        </div>
      ))}
      {!items.length ? (
        <p className="text-xs font-semibold text-[#8195a7]">Sin actividad registrada.</p>
      ) : null}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-black text-[#304b66]">
      <span>{label}</span>
      <span className="relative mt-1 block">{children}</span>
    </label>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#102a43]/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-black text-[#173654]">{title}</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="rounded-md p-1 text-[#71879b] hover:bg-[#f3f6f8]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
