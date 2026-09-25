"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Settings,
  CalendarDays,
  Users,
  UserRoundCheck,
  RefreshCw,
  Check,
  ClipboardList,
  TriangleAlert,
  FileText,
  ShoppingCart,
  Target,
  CircleDollarSign,
  Lightbulb,
  Package,
  Filter,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  X,
  Info,
  Download,
  Search,
  Boxes,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Activity,
  MapPin,
  UserRound,
  ExternalLink,
} from "lucide-react";
import { can, type AppRole } from "@/lib/roles";
import type { OperationsWorkspace } from "@/lib/operations-workspace";
import type { OperationsFilters, OperationsQueue } from "@/lib/operations-contract";
import styles from "./OperationsCenter.module.css";

const queues = [
  {
    id: "quotes",
    label: "Cotizaciones",
    icon: ClipboardList,
    task: "Revisar y responder cotización",
    action: "Responder",
  },
  {
    id: "opportunities",
    label: "Oportunidades",
    icon: CircleDollarSign,
    task: "Dar seguimiento a oportunidad",
    action: "Gestionar",
  },
  {
    id: "orders",
    label: "Pedidos",
    icon: ShoppingCart,
    task: "Gestionar pedido",
    action: "Revisar",
  },
  {
    id: "followUps",
    label: "Seguimientos",
    icon: Lightbulb,
    task: "Realizar seguimiento",
    action: "Resolver",
  },
  {
    id: "inventoryAlerts",
    label: "Inventario",
    icon: Package,
    task: "Revisar disponibilidad",
    action: "Revisar",
  },
] as const;
const teams = [
  ["VENTAS", "Ventas"],
  ["OPERACIONES", "Operaciones"],
  ["ALMACEN", "Almacén"],
];
const states: Record<OperationsQueue, string[][]> = {
  quotes: [
    ["DRAFT", "Borrador"],
    ["SENT", "Enviada"],
    ["FOLLOW_UP", "Seguimiento"],
    ["ACCEPTED", "Aceptada"],
  ],
  opportunities: [
    ["NEW", "Nueva"],
    ["CONTACTED", "Contactada"],
    ["QUOTING", "Cotizando"],
    ["QUOTE_SENT", "Cotización enviada"],
    ["FOLLOW_UP", "Seguimiento"],
    ["NEGOTIATION", "Negociación"],
  ],
  orders: [
    ["NEW", "Nuevo"],
    ["PAYMENT_PENDING", "Pago pendiente"],
    ["PAID", "Pagado"],
    ["PREPARING", "Preparando"],
    ["READY", "Listo"],
    ["IN_TRANSIT", "En tránsito"],
  ],
  followUps: [
    ["PENDING", "Pendiente"],
    ["IN_PROGRESS", "En proceso"],
  ],
  inventoryAlerts: [
    ["NO_STOCK", "Sin stock"],
    ["CRITICAL", "Stock crítico"],
  ],
};
const colors = ["#0066ff", "#08b776", "#ff8500", "#9238ff", "#ffbb00"];
const str = (value: unknown, fallback = "—") =>
  value == null || value === "" ? fallback : String(value);
const activityLabel = (action: unknown) => {
  const value = str(action, "Actualización operativa");
  return (
    {
      TAKE: "Tarea tomada",
      REASSIGN: "Responsable actualizado",
      RESOLVE: "Tarea resuelta",
      STATUS_CHANGE: "Estado actualizado",
      NOTE: "Actividad registrada",
    }[value] ?? value
  );
};
const displayState = (value: unknown) => {
  const state = str(value);
  return (
    {
      DRAFT: "Borrador",
      SENT: "Enviada",
      FOLLOW_UP: "Seguimiento",
      ACCEPTED: "Aceptada",
      NEW: "Nueva",
      CONTACTED: "Contactada",
      QUOTING: "Cotizando",
      QUOTE_SENT: "Cotización enviada",
      NEGOTIATION: "Negociación",
      PAYMENT_PENDING: "Pago pendiente",
      PAID: "Pagado",
      PREPARING: "En preparación",
      READY: "Listo",
      IN_TRANSIT: "En tránsito",
      PENDING: "Pendiente",
      IN_PROGRESS: "En proceso",
      CRITICAL: "Crítica",
      HIGH: "Alta",
      MEDIUM: "Media",
      NORMAL: "Normal",
      OVERDUE: "Vencida",
      DUE_SOON: "Próxima a vencer",
      ON_TRACK: "En plazo",
      NO_POLICY: "Sin plazo",
    }[state] ?? state.replaceAll("_", " ")
  );
};
type Row = Record<string, unknown>;
type Day = { resolved: number; inProgress: number; pending: number; overdue: number };
type DetailTab = "summary" | "kardex" | "activity";
type Props = {
  snapshot: OperationsWorkspace;
  role: AppRole;
  filters: OperationsFilters;
  filterOptions: {
    locations: { id: string; label: string }[];
    sellers: { id: string; label: string }[];
  };
  day: Day;
  comparison: {
    current: OperationsWorkspace;
    previous: OperationsWorkspace;
    previousDay: Day;
    label: string;
  };
};

function changeFor(current: number, previous: number, inverse = false) {
  const percent =
    previous === 0
      ? current === 0
        ? 0
        : 100
      : Math.round(((current - previous) / previous) * 100);
  const direction = Math.sign(percent);
  const positive = inverse ? direction < 0 : direction > 0;
  return {
    percent,
    direction,
    tone: direction === 0 ? "neutral" : positive ? "positive" : "negative",
  } as const;
}

function DayChart({ day }: { day: Day }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const values = [day.resolved, day.inProgress, day.pending, day.overdue];
  const total = values.reduce((a, b) => a + b, 0);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 280, 280);
    let angle = -Math.PI / 2;
    const palette = ["#08b776", "#0066ff", "#ff8500", "#ff2447"];
    (total ? [day.resolved, day.inProgress, day.pending, day.overdue] : [1]).forEach((value, i) => {
      const end = angle + (value / (total || 1)) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(140, 140, 116, angle, end);
      ctx.lineWidth = 32;
      ctx.strokeStyle = total ? palette[i] : "#eaf0f6";
      ctx.stroke();
      angle = end;
    });
  }, [day.resolved, day.inProgress, day.pending, day.overdue, total]); // values are derived from these four counts
  return (
    <div className={styles.dayContent}>
      <div className={styles.donut}>
        <canvas
          ref={canvas}
          width={280}
          height={280}
          role="img"
          aria-label={`Estado del día: ${values.join(", ")} tareas resueltas, en proceso, pendientes y vencidas`}
        />
        <span>
          <strong>{total}</strong>Tareas
        </span>
      </div>
      <div className={styles.legend}>
        {["Resueltas", "En proceso", "Pendientes", "Vencidas"].map((label, i) => (
          <div key={label}>
            <i style={{ background: ["#08b776", "#0066ff", "#ff8500", "#ff2447"][i] }} />
            <span>{label}</span>
            <b>{values[i]}</b>
            <small>{total ? Math.round((values[i] / total) * 100) : 0}%</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function InventoryInspector({
  detail,
  tab,
  setTab,
  history,
  historyError,
  onAssign,
}: {
  detail: Row;
  tab: DetailTab;
  setTab: (tab: DetailTab) => void;
  history: Row[] | null;
  historyError: boolean;
  onAssign: () => void;
}) {
  const onHand = Number(detail.onHand ?? 0);
  const reserved = Number(detail.reserved ?? 0);
  const available = Number(detail.available ?? onHand - reserved);
  const minimum = detail.minimumStock == null ? null : Number(detail.minimumStock);
  const deficit = minimum == null ? 0 : Math.max(0, minimum - available);
  const statusLabel = String(detail.severity) === "NO_STOCK" ? "Sin stock" : "Stock crítico";
  const assignee = detail.assigneeName
    ? String(detail.assigneeName)
    : detail.workItemAssigneeId
      ? "Responsable asignado"
      : "Sin asignar";
  const inventoryHref = Array.isArray(detail.actions)
    ? ((detail.actions as { label: string; href: string }[])[0]?.href ?? "/admin/inventario")
    : "/admin/inventario";
  const developmentEvents: Row[] = [
    {
      action: "Alerta de disponibilidad activa",
      note: `${available} unidades disponibles en ${str(detail.location, "el local seleccionado")}.`,
    },
    {
      action: "Balance de stock calculado",
      note: `${onHand} físico − ${reserved} reservado = ${available} disponible.`,
    },
    {
      action: minimum == null ? "Mínimo pendiente de configuración" : "Mínimo verificado",
      note:
        minimum == null
          ? "El producto todavía no tiene un umbral persistido."
          : `Umbral actual: ${minimum} unidades. Déficit: ${deficit}.`,
    },
  ];
  const events = history?.length ? history : developmentEvents;
  const usesDevelopmentData = history !== null && history.length === 0 && !historyError;
  const stock = [
    ["Físico", onHand],
    ["Reservado", reserved],
    ["Disponible", available],
    ["Mínimo", minimum],
  ] as const;
  const activityRows = (
    <div className={styles.inspectorTimeline}>
      {history === null ? (
        <p className={styles.inspectorLoading}>Cargando movimientos persistidos…</p>
      ) : historyError ? (
        <p className={styles.inspectorError}>No se pudo cargar la actividad. Intenta nuevamente.</p>
      ) : (
        events.map((event, index) => (
          <div key={str(event.id, String(index))}>
            <i aria-hidden="true" />
            <span>
              <strong>{activityLabel(event.action)}</strong>
              <small>{str(event.note, "Actualización operativa")}</small>
            </span>
            <time>
              {event.createdAt
                ? new Intl.DateTimeFormat("es-PE", {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: "America/Lima",
                  }).format(new Date(String(event.createdAt)))
                : "Estado actual"}
            </time>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className={styles.inventoryInspector}>
      <header className={styles.inspectorHeader}>
        <div className={styles.inspectorTitleRow}>
          <span>Inspector de inventario</span>
          <b>Datos de desarrollo</b>
        </div>
        <div className={styles.productIdentity}>
          <span className={styles.productVisual}>
            {detail.mediaUrl ? (
              <Image
                src={String(detail.mediaUrl)}
                alt=""
                fill
                sizes="64px"
                className={styles.productImage}
                unoptimized
              />
            ) : (
              <Package size={28} aria-hidden="true" />
            )}
          </span>
          <span>
            <small>{str(detail.sku)}</small>
            <h2>{str(detail.product, "Producto sin nombre")}</h2>
            <span className={styles.productMeta}>
              <b>{statusLabel}</b>
              <span>
                <MapPin size={12} /> {str(detail.location, "Local sin asignar")}
              </span>
            </span>
          </span>
        </div>
      </header>

      <nav className={styles.inspectorTabs} role="tablist" aria-label="Detalle de inventario">
        {[
          ["summary", "Resumen", Boxes],
          ["kardex", "Kardex", History],
          ["activity", "Actividad", Activity],
        ].map(([id, label, Icon]) => (
          <button
            key={String(id)}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id as DetailTab)}
          >
            <Icon size={16} /> {String(label)}
          </button>
        ))}
      </nav>

      <div className={styles.inspectorBody} role="tabpanel">
        {tab === "summary" ? (
          <>
            <section className={styles.stockPanel}>
              <div className={styles.inspectorSectionHeading}>
                <h3>Disponibilidad actual</h3>
                {deficit > 0 && <b>Déficit: {deficit} unidades</b>}
              </div>
              <div className={styles.stockGrid}>
                {stock.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong
                      className={
                        label === "Disponible" && available <= 0 ? styles.dangerValue : undefined
                      }
                    >
                      {value == null ? "—" : value}
                    </strong>
                  </div>
                ))}
              </div>
              <div className={styles.shortageAlert}>
                <TriangleAlert size={17} />
                <span>
                  <strong>{statusLabel}</strong>
                  <small>
                    {minimum == null
                      ? "Configura un mínimo antes de planificar la reposición."
                      : `Se requieren ${deficit} unidades para alcanzar el mínimo configurado.`}
                  </small>
                </span>
              </div>
            </section>

            <section className={styles.inspectorInfoGrid}>
              <div>
                <h3>Información del producto</h3>
                <dl>
                  <div>
                    <dt>Referencia</dt>
                    <dd>{str(detail.sku)}</dd>
                  </div>
                  <div>
                    <dt>Producto</dt>
                    <dd>{str(detail.product)}</dd>
                  </div>
                  <div>
                    <dt>Módulo</dt>
                    <dd>Inventario</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3>Información del almacén</h3>
                <dl>
                  <div>
                    <dt>Almacén</dt>
                    <dd>{str(detail.location)}</dd>
                  </div>
                  <div>
                    <dt>Responsable</dt>
                    <dd>{assignee}</dd>
                  </div>
                  <div>
                    <dt>Equipo</dt>
                    <dd>Almacén</dd>
                  </div>
                </dl>
                <button type="button" className={styles.assignButton} onClick={onAssign}>
                  <UserRound size={14} /> Asignar
                </button>
              </div>
            </section>

            <section className={styles.recommendedAction}>
              <ArrowLeftRight size={20} />
              <span>
                <small>Acción recomendada</small>
                <strong>
                  {available <= 0 ? "Reponer o transferir stock" : "Revisar el mínimo configurado"}
                </strong>
                <p>
                  {available <= 0
                    ? "Consulta otro almacén antes de registrar un ajuste manual."
                    : "Valida el conteo físico y el umbral de reposición."}
                </p>
              </span>
              <Link href={`${inventoryHref}&tab=transfers#inventory-operations`}>
                Transferir <ChevronRight size={15} />
              </Link>
            </section>

            <section className={styles.recentActivity}>
              <div className={styles.inspectorSectionHeading}>
                <h3>Movimientos recientes</h3>
                {usesDevelopmentData && <b>Datos de desarrollo</b>}
              </div>
              {activityRows}
            </section>
          </>
        ) : tab === "kardex" ? (
          <section className={styles.tabSection}>
            <div className={styles.inspectorSectionHeading}>
              <div>
                <h3>Kardex operativo</h3>
                <p>Movimientos vinculados a esta alerta.</p>
              </div>
              {usesDevelopmentData && <b>Datos de desarrollo</b>}
            </div>
            {activityRows}
            <Link className={styles.secondaryLink} href={inventoryHref}>
              Abrir Kardex completo <ExternalLink size={14} />
            </Link>
          </section>
        ) : (
          <section className={styles.tabSection}>
            <div className={styles.inspectorSectionHeading}>
              <div>
                <h3>Actividad de la alerta</h3>
                <p>Asignaciones y cambios del flujo operativo.</p>
              </div>
              {usesDevelopmentData && <b>Datos de desarrollo</b>}
            </div>
            {activityRows}
          </section>
        )}
      </div>

      <footer className={styles.inspectorFooter}>
        <Link className={styles.inspectorPrimary} href={inventoryHref}>
          <SlidersHorizontal size={16} /> Gestionar inventario
        </Link>
        <button type="button" onClick={onAssign}>
          <UserRound size={15} /> Asignar
        </button>
        <Link href={inventoryHref}>
          Abrir inventario <ExternalLink size={14} />
        </Link>
      </footer>
    </div>
  );
}

function OperationsInspector({
  detail,
  queue,
  tab,
  setTab,
  history,
  historyError,
  onAssign,
}: {
  detail: Row;
  queue: Exclude<OperationsQueue, "inventoryAlerts">;
  tab: DetailTab;
  setTab: (tab: DetailTab) => void;
  history: Row[] | null;
  historyError: boolean;
  onAssign: () => void;
}) {
  const presentation = {
    quotes: {
      label: "Cotización",
      title: "Inspector de cotización",
      context: "Cliente y referencia",
      flow: "Flujo comercial",
      recommendation: "Revisar condiciones y responder al cliente",
      Icon: FileText,
    },
    opportunities: {
      label: "Oportunidad",
      title: "Inspector de oportunidad",
      context: "Cliente y seguimiento",
      flow: "Seguimiento",
      recommendation: "Completar la próxima acción comercial",
      Icon: Target,
    },
    orders: {
      label: "Pedido",
      title: "Inspector de pedido",
      context: "Cliente y entrega",
      flow: "Preparación",
      recommendation: "Validar el siguiente paso del pedido",
      Icon: ShoppingCart,
    },
    followUps: {
      label: "Seguimiento",
      title: "Inspector de seguimiento",
      context: "Cliente y oportunidad",
      flow: "Contexto",
      recommendation: "Registrar el contacto y completar la tarea",
      Icon: Lightbulb,
    },
  }[queue];
  const actions = Array.isArray(detail.actions)
    ? (detail.actions as { label: string; href: string }[]).filter(
        (action) => !action.href.startsWith("/api/"),
      )
    : [];
  const primaryAction = actions[0];
  const activityAction = actions.find((action) => /actividad/i.test(action.label));
  const state = displayState(detail.status ?? detail.stage ?? detail.workItemStatus);
  const priority = displayState(detail.priority ?? detail.workItemPriority);
  const sla = displayState(
    detail.workItemSlaState ?? (detail.overdue ? "OVERDUE" : detail.due ? "ON_TRACK" : "NO_POLICY"),
  );
  const assignee = detail.assigneeName
    ? String(detail.assigneeName)
    : detail.seller
      ? String(detail.seller)
      : detail.workItemAssigneeId
        ? "Responsable asignado"
        : "Sin asignar";
  const reference = str(detail.code ?? detail.opportunity ?? detail.id);
  const title = str(detail.title ?? detail.product, presentation.label);
  const formatDate = (value: unknown) => {
    if (!value) return "—";
    const date = new Date(String(value));
    return Number.isNaN(date.getTime())
      ? str(value)
      : new Intl.DateTimeFormat("es-PE", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "America/Lima",
        }).format(date);
  };
  const developmentEvents: Row[] = [
    {
      action: `${presentation.label} en estado ${state.toLowerCase()}`,
      note: `La referencia ${reference} mantiene el estado operativo mostrado.`,
      createdAt: detail.date,
    },
    {
      action: assignee === "Sin asignar" ? "Responsable pendiente" : "Responsable actual",
      note:
        assignee === "Sin asignar"
          ? "La tarea todavía no tiene una persona asignada."
          : `${assignee} figura como responsable del flujo.`,
    },
    {
      action: `SLA: ${sla}`,
      note: detail.nextAction
        ? `Próxima acción: ${str(detail.nextAction)}.`
        : "No existe una próxima acción persistida.",
    },
  ];
  const events = history?.length ? history : developmentEvents;
  const usesDevelopmentData = history !== null && history.length === 0 && !historyError;
  const activityRows = (
    <div className={styles.inspectorTimeline}>
      {history === null ? (
        <p className={styles.inspectorLoading}>Cargando actividad persistida…</p>
      ) : historyError ? (
        <p className={styles.inspectorError}>No se pudo cargar la actividad.</p>
      ) : (
        events.map((event, index) => (
          <div key={str(event.id, String(index))}>
            <i aria-hidden="true" />
            <span>
              <strong>{activityLabel(event.action)}</strong>
              <small>{str(event.note, "Actualización operativa")}</small>
            </span>
            <time>{event.createdAt ? formatDate(event.createdAt) : "Registrado"}</time>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className={styles.inventoryInspector}>
      <header className={styles.inspectorHeader}>
        <div className={styles.inspectorTitleRow}>
          <span>{presentation.title}</span>
          <b>{presentation.label}</b>
        </div>
        <div className={styles.productIdentity}>
          <span className={styles.productVisual}>
            {detail.mediaUrl ? (
              <Image
                src={String(detail.mediaUrl)}
                alt=""
                fill
                sizes="64px"
                className={styles.productImage}
                unoptimized
              />
            ) : (
              <presentation.Icon size={28} aria-hidden="true" />
            )}
          </span>
          <span>
            <span className={styles.identityTopline}>
              <small>{reference}</small>
              <b>{priority}</b>
            </span>
            <h2>{title}</h2>
            <span className={styles.productMeta}>
              <b>{state}</b>
              <span>
                {str(detail.customer)} · Módulo: {presentation.label}
              </span>
            </span>
          </span>
        </div>
      </header>

      <nav
        className={styles.inspectorTabs}
        role="tablist"
        aria-label={`Detalle de ${presentation.label}`}
      >
        {[
          ["summary", "Resumen", Boxes],
          ["kardex", presentation.flow, History],
          ["activity", "Actividad", Activity],
        ].map(([id, label, Icon]) => (
          <button
            key={String(id)}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id as DetailTab)}
          >
            <Icon size={16} /> {String(label)}
          </button>
        ))}
      </nav>

      <div className={styles.inspectorBody} role="tabpanel">
        {tab === "summary" ? (
          <>
            <section className={styles.operationSnapshot}>
              <div className={styles.inspectorSectionHeading}>
                <h3>Estado operativo</h3>
                <b>{presentation.label}</b>
              </div>
              <div className={styles.operationMetrics}>
                <div>
                  <span>Estado</span>
                  <strong>{state}</strong>
                </div>
                <div>
                  <span>Urgencia</span>
                  <strong>{priority}</strong>
                </div>
                <div>
                  <span>SLA</span>
                  <strong>{sla}</strong>
                </div>
                <div>
                  <span>{detail.validUntil ? "Vigencia" : "Creada"}</span>
                  <strong>{formatDate(detail.validUntil ?? detail.date)}</strong>
                </div>
              </div>
            </section>

            <section className={styles.inspectorInfoGrid}>
              <div>
                <h3>{presentation.context}</h3>
                <dl>
                  <div>
                    <dt>Cliente</dt>
                    <dd>{str(detail.customer)}</dd>
                  </div>
                  <div>
                    <dt>Referencia</dt>
                    <dd>{reference}</dd>
                  </div>
                  <div>
                    <dt>Documento</dt>
                    <dd>{str(detail.documentNumber)}</dd>
                  </div>
                  <div>
                    <dt>Teléfono</dt>
                    <dd>{str(detail.phone)}</dd>
                  </div>
                  <div>
                    <dt>Correo</dt>
                    <dd>{str(detail.email)}</dd>
                  </div>
                  <div>
                    <dt>{queue === "followUps" ? "Oportunidad" : "Contacto"}</dt>
                    <dd>{str(detail.opportunity ?? detail.preferredContact)}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3>Responsabilidad</h3>
                <dl>
                  <div>
                    <dt>Responsable</dt>
                    <dd>{assignee}</dd>
                  </div>
                  <div>
                    <dt>Local</dt>
                    <dd>{str(detail.location)}</dd>
                  </div>
                  <div>
                    <dt>Origen</dt>
                    <dd>{displayState(detail.origin)}</dd>
                  </div>
                  <div>
                    <dt>Creación</dt>
                    <dd>{formatDate(detail.date)}</dd>
                  </div>
                  <div>
                    <dt>{detail.due || detail.followUp ? "Vencimiento" : "Antigüedad"}</dt>
                    <dd>
                      {detail.due || detail.followUp
                        ? formatDate(detail.due ?? detail.followUp)
                        : detail.ageDays == null
                          ? "—"
                          : `${detail.ageDays} días`}
                    </dd>
                  </div>
                </dl>
                {Boolean(detail.workItemId) && (
                  <button type="button" className={styles.assignButton} onClick={onAssign}>
                    <UserRound size={14} /> Asignar
                  </button>
                )}
              </div>
            </section>

            <section className={styles.recommendedAction}>
              <ChevronRight size={20} />
              <span>
                <small>Acción recomendada</small>
                <strong>{presentation.recommendation}</strong>
                <p>
                  Continúa desde el módulo de origen para mantener el historial y las reglas del
                  flujo.
                </p>
              </span>
              {primaryAction && (
                <Link href={primaryAction.href}>
                  {primaryAction.label}
                  <ChevronRight size={15} />
                </Link>
              )}
            </section>

            <section className={styles.recentActivity}>
              <div className={styles.inspectorSectionHeading}>
                <h3>Actividad reciente</h3>
                {usesDevelopmentData && <b>Datos de desarrollo</b>}
              </div>
              {activityRows}
              {activityAction && (
                <Link className={styles.activityLink} href={activityAction.href}>
                  Ver actividad completa <ExternalLink size={13} />
                </Link>
              )}
            </section>
          </>
        ) : tab === "kardex" ? (
          <section className={styles.tabSection}>
            <div className={styles.inspectorSectionHeading}>
              <div>
                <h3>{presentation.flow}</h3>
                <p>Datos operativos disponibles para esta tarea.</p>
              </div>
            </div>
            <dl className={styles.flowDetails}>
              <div>
                <dt>Estado</dt>
                <dd>{state}</dd>
              </div>
              <div>
                <dt>Urgencia</dt>
                <dd>{priority}</dd>
              </div>
              <div>
                <dt>SLA</dt>
                <dd>{sla}</dd>
              </div>
              <div>
                <dt>Responsable</dt>
                <dd>{assignee}</dd>
              </div>
              <div>
                <dt>Próxima acción</dt>
                <dd>{str(detail.nextAction)}</dd>
              </div>
            </dl>
            <div className={styles.detailActions}>
              {actions.map((action) => (
                <Link key={`${action.label}-${action.href}`} href={action.href}>
                  {action.label}
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section className={styles.tabSection}>
            <div className={styles.inspectorSectionHeading}>
              <div>
                <h3>Historial de la tarea</h3>
                <p>Asignaciones y cambios persistidos.</p>
              </div>
              {usesDevelopmentData && <b>Datos de desarrollo</b>}
            </div>
            {activityRows}
          </section>
        )}
      </div>

      <footer className={styles.inspectorFooter}>
        {actions.map((action, index) =>
          /asignar/i.test(action.label) && Boolean(detail.workItemId) ? (
            <button key={`${action.label}-footer`} type="button" onClick={onAssign}>
              <UserRound size={15} /> {action.label}
            </button>
          ) : (
            <Link
              key={`${action.label}-footer`}
              className={index === 0 ? styles.inspectorPrimary : undefined}
              href={action.href}
            >
              {index === 0 && <SlidersHorizontal size={16} />}
              {action.label}
              {index > 0 && <ExternalLink size={14} />}
            </Link>
          ),
        )}
      </footer>
    </div>
  );
}

export function OperationsCenter({
  snapshot,
  role,
  filters,
  filterOptions,
  day,
  comparison,
}: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [pending, transition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Row | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("summary");
  const [history, setHistory] = useState<Row[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const detailRequest = useRef(0);
  const [dialog, setDialog] = useState<"take" | "reassign" | "resolve" | "alerts" | "teams" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [assignee, setAssignee] = useState("");
  const [reason, setReason] = useState("");
  const modalOpen = Boolean(dialog || detail);
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const trap = (event: KeyboardEvent) => {
      const modal = document.querySelector<HTMLElement>('[data-operations-center] [role="dialog"]');
      if (!modal) return;
      if (event.key === "Escape" && !busy) {
        setDialog(null);
        setDetail(null);
      }
      if (event.key !== "Tab") return;
      const targets = [
        ...modal.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
        ),
      ];
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [modalOpen, busy]);
  const selectedQueue = filters.queue ?? "quotes";
  const config = queues.find((q) => q.id === selectedQueue)!;
  const rows = snapshot.queues[selectedQueue];
  const total = snapshot.queueTotals[selectedQueue];
  const pages = Math.max(1, Math.ceil(total / filters.pageSize));
  const active = comparison.current.teamLoad.reduce((sum, team) => sum + team.active, 0);
  const previousActive = comparison.previous.teamLoad.reduce((sum, team) => sum + team.active, 0);
  const filterCount = [
    filters.status,
    filters.locationId,
    filters.sellerId,
    filters.assigneeId,
    filters.urgency,
    filters.sla,
  ].filter(Boolean).length;
  const href = (changes: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams(search.toString());
    Object.entries(changes).forEach(([key, value]) =>
      value == null || value === "" ? query.delete(key) : query.set(key, String(value)),
    );
    return `/admin/operaciones?${query}`;
  };
  function navigate(changes: Record<string, string | number | undefined>) {
    setSelected([]);
    setMessage("");
    transition(() => router.push(href(changes)));
  }
  const alerts = [
    {
      title: `${day.overdue} tareas vencidas hoy`,
      copy: "Requieren atención inmediata.",
      color: "#b42318",
      icon: TriangleAlert,
      queue: "followUps",
      extra: { sla: "OVERDUE" },
    },
    {
      title: `${snapshot.operationalSignals.blockedOrders} pedidos detenidos`,
      copy: "Por incidencias que bloquean el pedido.",
      color: "#8a4b08",
      icon: ClipboardList,
      queue: "orders",
      extra: { urgency: "CRITICAL" },
    },
    {
      title: `${snapshot.operationalSignals.pendingTransfers} transferencias pendientes`,
      copy: "Solicitadas o en tránsito.",
      color: "#6d28d9",
      icon: RefreshCw,
      href: "/admin/inventario?tab=transfers#inventory-operations",
    },
    {
      title: `${snapshot.metrics.overdueTasks} seguimientos críticos`,
      copy: "Seguimientos que superaron su vencimiento.",
      color: "#8a4b08",
      icon: Target,
      queue: "followUps",
      extra: { sla: "OVERDUE" },
    },
  ];
  const metrics = [
    {
      label: "Tareas activas",
      value: active,
      previous: previousActive,
      icon: ClipboardList,
      color: "#0066ff",
      queue: selectedQueue,
    },
    {
      label: "Vencidas hoy",
      value: day.overdue,
      previous: comparison.previousDay.overdue,
      comparisonLabel: "vs. ayer",
      icon: TriangleAlert,
      color: "#ff2447",
      queue: "followUps",
    },
    {
      label: "Cotizaciones por responder",
      value: comparison.current.metrics.openQuotes,
      previous: comparison.previous.metrics.openQuotes,
      icon: FileText,
      color: "#ff8500",
      queue: "quotes",
    },
    {
      label: "Pedidos detenidos",
      value: comparison.current.operationalSignals.blockedOrders,
      previous: comparison.previous.operationalSignals.blockedOrders,
      icon: ShoppingCart,
      color: "#08b776",
      queue: "orders",
    },
    {
      label: "Transferencias pendientes",
      value: comparison.current.operationalSignals.pendingTransfers,
      previous: comparison.previous.operationalSignals.pendingTransfers,
      icon: RefreshCw,
      color: "#9238ff",
      href: "/admin/inventario?tab=transfers#inventory-operations",
    },
    {
      label: "Seguimientos críticos",
      value: comparison.current.metrics.overdueTasks,
      previous: comparison.previous.metrics.overdueTasks,
      icon: Target,
      color: "#ff5500",
      queue: "followUps",
    },
  ];
  const teamGroups = teams.map(([id, label], i) => ({
    id,
    label,
    color: colors[i],
    count: snapshot.teamLoad.filter((t) => t.team === id).reduce((a, t) => a + t.active, 0),
  }));
  const teamTotal = teamGroups.reduce((a, t) => a + t.count, 0);
  function openAction(action: "take" | "reassign" | "resolve") {
    setMessage("");
    setReason("");
    setDialog(action);
  }
  async function runAction() {
    if (!dialog || !["take", "reassign", "resolve"].includes(dialog)) return;
    setBusy(true);
    setMessage("");
    const failures: string[] = [];
    const succeeded: string[] = [];
    for (const id of selected) {
      try {
        const response = await fetch(`/api/admin/operaciones/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: dialog, assigneeId: assignee || null, reason }),
        });
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            typeof payload.error === "string"
              ? payload.error
              : (payload.error?.message ?? "No se pudo actualizar la tarea."),
          );
        succeeded.push(id);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : "No se pudo actualizar la tarea.");
      }
    }
    setSelected(selected.filter((id) => !succeeded.includes(id)));
    setMessage(
      `${succeeded.length} tareas actualizadas.${failures.length ? ` ${failures.length} no se actualizaron: ${[...new Set(failures)].join(" ")}` : ""}`,
    );
    if (!failures.length) setDialog(null);
    setBusy(false);
    router.refresh();
  }
  async function openDetail(row: Row) {
    setDetail(row);
    setDetailTab("summary");
    setHistory(null);
    setHistoryError(false);
    const requestId = ++detailRequest.current;
    if (!row.workItemId) {
      setHistory([]);
      return;
    }
    try {
      const response = await fetch(
        `/api/admin/operaciones/${encodeURIComponent(String(row.workItemId))}`,
      );
      const payload = await response.json();
      if (requestId !== detailRequest.current) return;
      if (!response.ok) throw new Error("No se pudo consultar el historial.");
      setDetail((current) =>
        current?.workItemId === row.workItemId
          ? { ...current, workItem: payload.item, assigneeName: payload.assignee }
          : current,
      );
      setHistory(payload.history ?? []);
    } catch {
      if (requestId === detailRequest.current) {
        setHistoryError(true);
        setHistory([]);
      }
    }
  }
  const actionRows = selected
    .map((id) => rows.find((row) => row.workItemId === id))
    .filter(Boolean);
  return (
    <div className={styles.center} aria-busy={pending} data-operations-center>
      <div className={styles.heading}>
        <div className={styles.headingTitle}>
          <span className={styles.gear}>
            <Settings size={30} />
          </span>
          <div>
            <h1>Centro operativo</h1>
            <p>Supervisa, coordina y resuelve las operaciones diarias de ColdPower.</p>
          </div>
        </div>
        <div className={styles.toolbar}>
          <label className={styles.selectButton}>
            <CalendarDays size={16} />
            <select
              aria-label="Período operativo"
              value={filters.range}
              onChange={(e) => {
                const range = e.target.value;
                if (range === "custom") setShowFilters(true);
                navigate({ range, from: undefined, to: undefined, page: 1 });
              }}
            >
              {[
                ["all", "Todo el período"],
                ["today", "Hoy"],
                ["yesterday", "Ayer"],
                ["week", "Últimos 7 días"],
                ["month", "Últimos 30 días"],
                ["custom", "Personalizado"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.selectButton}>
            <Users size={16} />
            <select
              aria-label="Equipo operativo"
              value={filters.team ?? ""}
              onChange={(e) => navigate({ team: e.target.value, page: 1 })}
            >
              <option value="">Todos los equipos</option>
              {teams.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={!selected.length || busy || actionRows.some((row) => row?.workItemAssigneeId)}
            onClick={() => openAction("take")}
            title="Selecciona tareas sin asignar"
          >
            <UserRoundCheck size={17} />
            Tomar tarea
          </button>
          <button
            disabled={!selected.length || !can(role, "operations.assign") || busy}
            onClick={() => openAction("reassign")}
          >
            <RefreshCw size={17} />
            Reasignar
          </button>
          <button
            className={styles.primary}
            disabled={
              !selected.length || selectedQueue !== "followUps" || !can(role, "crm.edit") || busy
            }
            title="Selecciona seguimientos; las demás tareas se resuelven desde su módulo"
            onClick={() => openAction("resolve")}
          >
            <Check size={19} />
            Resolver
          </button>
        </div>
      </div>
      {message && !dialog && (
        <p className={styles.notice} role="status">
          {message}
        </p>
      )}
      <div className={styles.metrics}>
        {metrics.map((metric, i) => {
          const change = changeFor(metric.value, metric.previous, i > 0);
          const lineStart = change.direction === 0 ? 16 : change.direction > 0 ? 24 : 7;
          const lineEnd = change.direction === 0 ? 16 : change.direction > 0 ? 7 : 24;
          return (
            <a
              key={metric.label}
              className={styles.metric}
              href={
                metric.href ??
                href({
                  queue: metric.queue,
                  page: 1,
                  status: undefined,
                  sla: i === 1 || i === 5 ? "OVERDUE" : undefined,
                  urgency: i === 3 ? "CRITICAL" : undefined,
                })
              }
              style={{ "--tone": metric.color } as React.CSSProperties}
            >
              <div className={styles.metricMain}>
                <span className={styles.bubble}>
                  <metric.icon size={24} />
                </span>
                <div>
                  <p>{metric.label}</p>
                  <strong>{metric.value}</strong>
                  <small className={styles[change.tone]}>
                    <span aria-hidden="true">
                      {change.direction > 0 ? "↗" : change.direction < 0 ? "↘" : "→"}
                    </span>
                    {Math.abs(change.percent)}% {metric.comparisonLabel ?? comparison.label}
                  </small>
                </div>
              </div>
              <div className={styles.trend} aria-label={`Periodo anterior: ${metric.previous}`}>
                <svg viewBox="0 0 180 32" aria-hidden="true">
                  <path d={`M 5 ${lineStart} C 45 ${lineStart}, 130 ${lineEnd}, 175 ${lineEnd}`} />
                  <circle cx="5" cy={lineStart} r="2.5" />
                  <circle cx="175" cy={lineEnd} r="2.5" />
                </svg>
                <span>Anterior: {metric.previous}</span>
              </div>
            </a>
          );
        })}
      </div>
      <div className={styles.workspace}>
        <section className={styles.queue}>
          <nav className={styles.tabs} aria-label="Bandejas operativas">
            {queues.map((q) => (
              <Link
                key={q.id}
                href={href({ queue: q.id, page: 1, status: undefined })}
                aria-current={q.id === selectedQueue ? "page" : undefined}
                onClick={() => setSelected([])}
              >
                <q.icon size={20} />
                <span>{q.label}</span>
                <b>{snapshot.queueTotals[q.id]}</b>
              </Link>
            ))}
          </nav>
          <div className={styles.queueBody}>
            <div className={styles.queueHeading}>
              <div>
                <h2>
                  Cola de tareas prioritarias <Info size={14} />
                </h2>
                <p>
                  {selected.length
                    ? `${selected.length} tareas seleccionadas`
                    : "Gestiona y da seguimiento a las tareas operativas de todos los módulos."}
                </p>
              </div>
              <div className={styles.inline}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  aria-expanded={showFilters}
                  aria-controls="operations-filters"
                >
                  <Filter size={17} />
                  Filtros{filterCount > 0 && <b className={styles.count}>{filterCount}</b>}
                </button>
                <details className={styles.menu}>
                  <summary aria-label="Opciones de la bandeja">
                    <MoreVertical size={18} />
                  </summary>
                  <div>
                    <a
                      href={`/api/admin/operaciones/export?${new URLSearchParams(href({ queue: selectedQueue }).split("?")[1])}`}
                      download
                    >
                      <Download size={15} />
                      Exportar bandeja
                    </a>
                    <button onClick={() => router.refresh()}>
                      <RefreshCw size={15} />
                      Actualizar
                    </button>
                  </div>
                </details>
              </div>
            </div>
            {showFilters && (
              <form
                id="operations-filters"
                className={styles.filters}
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const changes: Record<string, string | number | undefined> = { page: 1 };
                  [
                    "status",
                    "locationId",
                    "sellerId",
                    "assigneeId",
                    "urgency",
                    "sla",
                    "from",
                    "to",
                  ].forEach((key) => (changes[key] = str(form.get(key), "")));
                  if (form.get("from") || form.get("to")) changes.range = "custom";
                  navigate(changes);
                  setShowFilters(false);
                }}
              >
                <label>
                  Estado
                  <select name="status" defaultValue={filters.status ?? ""}>
                    <option value="">Todos</option>
                    {states[selectedQueue].map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Local
                  <select
                    name="locationId"
                    defaultValue={filters.locationId ?? ""}
                    disabled={!["orders", "inventoryAlerts"].includes(selectedQueue)}
                  >
                    <option value="">Todos</option>
                    {filterOptions.locations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Vendedor
                  <select
                    name="sellerId"
                    defaultValue={filters.sellerId ?? ""}
                    disabled={selectedQueue === "inventoryAlerts"}
                  >
                    <option value="">Todos</option>
                    {filterOptions.sellers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Responsable
                  <select name="assigneeId" defaultValue={filters.assigneeId ?? ""}>
                    <option value="">Todos</option>
                    {filterOptions.sellers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Urgencia
                  <select name="urgency" defaultValue={filters.urgency ?? ""}>
                    <option value="">Todas</option>
                    {[
                      ["LOW", "Baja"],
                      ["NORMAL", "Normal"],
                      ["MEDIUM", "Media"],
                      ["HIGH", "Alta"],
                      ["CRITICAL", "Crítica"],
                    ].map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  SLA
                  <select name="sla" defaultValue={filters.sla ?? ""}>
                    <option value="">Todos</option>
                    {[
                      ["NO_POLICY", "Sin política"],
                      ["ON_TRACK", "En tiempo"],
                      ["DUE_SOON", "Por vencer"],
                      ["OVERDUE", "Vencido"],
                    ].map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Desde
                  <input
                    type="date"
                    name="from"
                    defaultValue={filters.range === "custom" ? filters.from : ""}
                  />
                </label>
                <label>
                  Hasta
                  <input
                    type="date"
                    name="to"
                    defaultValue={filters.range === "custom" ? filters.to : ""}
                  />
                </label>
                <div className={styles.filterFooter}>
                  <button type="submit" className={styles.primary}>
                    Aplicar filtros
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        status: undefined,
                        locationId: undefined,
                        sellerId: undefined,
                        assigneeId: undefined,
                        urgency: undefined,
                        sla: undefined,
                        from: undefined,
                        to: undefined,
                        range: "all",
                        page: 1,
                      })
                    }
                  >
                    Limpiar
                  </button>
                  <small>Los filtros deshabilitados no aplican a esta bandeja.</small>
                </div>
              </form>
            )}
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todas las tareas de esta página"
                        checked={
                          !!rows.length && rows.every((r) => selected.includes(str(r.workItemId)))
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? rows.filter((r) => r.workItemId).map((r) => String(r.workItemId))
                              : [],
                          )
                        }
                      />
                    </th>
                    {[
                      "ID",
                      "Tarea",
                      selectedQueue === "inventoryAlerts"
                        ? "Producto / almacén"
                        : "Cliente / referencia",
                      "Urgencia",
                      "SLA",
                      "Responsable",
                      "Módulo",
                      "Próxima acción",
                      "Acciones",
                    ].map((label, i) => (
                      <th key={i}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const id = str(row.workItemId);
                    const code = str(row.code ?? row.sku ?? row.id);
                    const priority = str(row.priority ?? row.severity, "NORMAL").toUpperCase();
                    const high = ["HIGH", "CRITICAL", "NO_STOCK", "ALTA"].includes(priority);
                    const medium = ["MEDIUM", "MEDIA"].includes(priority);
                    const name =
                      filterOptions.sellers.find((s) => s.id === row.workItemAssigneeId)?.label ??
                      "Sin asignar";
                    const initials =
                      name === "Sin asignar"
                        ? null
                        : name
                            .split(" ")
                            .slice(0, 2)
                            .map((p) => p[0])
                            .join("");
                    const due = row.due ? new Date(String(row.due)) : null;
                    const overdue = !!row.overdue;
                    const actions = Array.isArray(row.actions)
                      ? (row.actions as { label: string; href: string }[])
                      : [];
                    const next =
                      actions.find(
                        (a) =>
                          !["Abrir", "Cancelar", "Asignar"].includes(a.label) &&
                          !a.href.startsWith("/api/"),
                      ) ?? actions.find((a) => !a.href.startsWith("/api/"));
                    return (
                      <tr
                        key={`${str(row.id)}-${str(row.locationId, index.toString())}`}
                        data-selected={selected.includes(id)}
                      >
                        <td>
                          <input
                            type="checkbox"
                            disabled={!row.workItemId}
                            aria-label={`Seleccionar ${code}`}
                            checked={selected.includes(id)}
                            onChange={(e) =>
                              setSelected(
                                e.target.checked
                                  ? [...selected, id]
                                  : selected.filter((s) => s !== id),
                              )
                            }
                          />
                        </td>
                        <td>
                          <button
                            className={styles.textButton}
                            onClick={() => void openDetail(row)}
                          >
                            {code}
                          </button>
                        </td>
                        <td>{str(row.title ?? row.nextAction, config.task)}</td>
                        <td>
                          {str(selectedQueue === "inventoryAlerts" ? row.product : row.customer)}
                          <small>{str(row.location ?? row.opportunity ?? row.product, "")}</small>
                        </td>
                        <td>
                          <span
                            className={`${styles.priority} ${high ? styles.high : medium ? styles.medium : styles.low}`}
                          >
                            {high
                              ? priority === "CRITICAL" || priority === "NO_STOCK"
                                ? "Crítica"
                                : "Alta"
                              : medium
                                ? "Media"
                                : priority === "LOW"
                                  ? "Baja"
                                  : "Normal"}
                          </span>
                        </td>
                        <td className={overdue ? styles.overdue : undefined}>
                          {due
                            ? due.toLocaleDateString("es-PE", { day: "2-digit", month: "short" })
                            : "Sin plazo"}
                        </td>
                        <td>
                          <span className={styles.person}>
                            {initials ? (
                              <i style={{ background: colors[index % colors.length] }}>
                                {initials}
                              </i>
                            ) : (
                              <Users size={17} />
                            )}
                            <span>{name}</span>
                          </span>
                        </td>
                        <td>{config.label}</td>
                        <td>
                          {next ? (
                            <Link className={styles.rowAction} href={next.href}>
                              {selectedQueue === "quotes"
                                ? "Responder"
                                : next.label === "Abrir"
                                  ? config.action
                                  : next.label}
                            </Link>
                          ) : (
                            <button
                              className={styles.rowAction}
                              onClick={() => void openDetail(row)}
                            >
                              Ver detalle
                            </button>
                          )}
                        </td>
                        <td>
                          <button
                            className={styles.iconButton}
                            aria-label={`Ver detalles de ${code}`}
                            onClick={() => void openDetail(row)}
                          >
                            <MoreVertical size={17} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!rows.length && (
                <div className={styles.empty}>
                  <Search size={28} />
                  <h3>No hay tareas en esta bandeja</h3>
                  <p>Prueba otro período o ajusta los filtros.</p>
                  <button
                    onClick={() =>
                      navigate({ status: undefined, urgency: undefined, sla: undefined, page: 1 })
                    }
                  >
                    Limpiar filtros de tarea
                  </button>
                </div>
              )}
            </div>
            <footer className={styles.pagination}>
              <span>
                Mostrando {total ? (filters.page - 1) * filters.pageSize + 1 : 0} a{" "}
                {Math.min(filters.page * filters.pageSize, total)} de {total} tareas
              </span>
              <nav aria-label="Páginas de tareas">
                <button
                  aria-label="Página anterior"
                  disabled={filters.page <= 1}
                  onClick={() => navigate({ page: filters.page - 1 })}
                >
                  <ChevronLeft size={17} />
                </button>
                {Array.from(
                  new Set([
                    1,
                    ...Array.from({ length: 3 }, (_, i) => filters.page + i - 1).filter(
                      (n) => n > 1 && n < pages,
                    ),
                    pages,
                  ]),
                )
                  .sort((a, b) => a - b)
                  .map((page, i, all) => (
                    <span key={page}>
                      {i > 0 && page - all[i - 1] > 1 && <small>…</small>}
                      <button
                        aria-current={page === filters.page ? "page" : undefined}
                        onClick={() => navigate({ page })}
                      >
                        {page}
                      </button>
                    </span>
                  ))}
                <button
                  aria-label="Página siguiente"
                  disabled={filters.page >= pages}
                  onClick={() => navigate({ page: filters.page + 1 })}
                >
                  <ChevronRight size={17} />
                </button>
              </nav>
              <select
                aria-label="Tareas por página"
                value={filters.pageSize}
                onChange={(e) => navigate({ pageSize: e.target.value, page: 1 })}
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} por página
                  </option>
                ))}
              </select>
            </footer>
          </div>
        </section>
        <aside className={styles.rightColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <h2>Alertas operativas</h2>
              <button onClick={() => setDialog("alerts")}>Ver todas</button>
            </div>
            <div className={styles.alerts}>
              {alerts.map((a) => (
                <a
                  key={a.title}
                  href={
                    a.href ??
                    href({
                      queue: a.queue,
                      page: 1,
                      status: undefined,
                      sla: undefined,
                      urgency: undefined,
                      ...a.extra,
                    })
                  }
                >
                  <span
                    className={styles.bubble}
                    style={{ "--tone": a.color } as React.CSSProperties}
                  >
                    <a.icon size={23} />
                  </span>
                  <div>
                    <strong style={{ color: a.color }}>{a.title}</strong>
                    <p>{a.copy}</p>
                  </div>
                  <ChevronRight size={15} />
                </a>
              ))}
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <h2>Carga por equipo</h2>
              <button onClick={() => setDialog("teams")}>Ver detalle</button>
            </div>
            <div className={styles.teamBars}>
              {teamGroups.map((team) => (
                <button key={team.id} onClick={() => navigate({ team: team.id, page: 1 })}>
                  <span>{team.label}</span>
                  <meter
                    min={0}
                    max={teamTotal || 1}
                    value={team.count}
                    style={{ "--bar": team.color } as React.CSSProperties}
                    aria-label={`Carga de ${team.label}`}
                  />
                  <b>{team.count}</b>
                  <small>{teamTotal ? Math.round((team.count / teamTotal) * 100) : 0}%</small>
                </button>
              ))}
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <h2>Estado de tareas del día</h2>
              <span title="Agenda de hoy y vencidas pendientes, hora de Lima. El período de la cabecera no cambia la agenda del día.">
                <Info size={14} />
              </span>
            </div>
            <DayChart day={day} />
          </section>
        </aside>
      </div>
      {(dialog || detail) && (
        <div
          className={styles.overlay}
          onClick={() => {
            if (!busy) {
              setDialog(null);
              setDetail(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={
              detail
                ? "Detalle de tarea"
                : dialog === "teams"
                  ? "Carga por equipo"
                  : dialog === "alerts"
                    ? "Alertas operativas"
                    : "Actualizar tareas"
            }
            className={detail ? `${styles.drawer} ${styles.inventoryDrawer}` : styles.dialog}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !busy) {
                setDialog(null);
                setDetail(null);
              }
            }}
          >
            <button
              autoFocus
              className={styles.close}
              aria-label="Cerrar"
              disabled={busy}
              onClick={() => {
                setDialog(null);
                setDetail(null);
              }}
            >
              <X size={20} />
            </button>
            {detail && selectedQueue === "inventoryAlerts" ? (
              <InventoryInspector
                detail={detail}
                tab={detailTab}
                setTab={setDetailTab}
                history={history}
                historyError={historyError}
                onAssign={() => {
                  if (!detail.workItemId) return;
                  setSelected([String(detail.workItemId)]);
                  setDetail(null);
                  setReason("");
                  setDialog("reassign");
                }}
              />
            ) : detail ? (
              <OperationsInspector
                detail={detail}
                queue={selectedQueue as Exclude<OperationsQueue, "inventoryAlerts">}
                tab={detailTab}
                setTab={setDetailTab}
                history={history}
                historyError={historyError}
                onAssign={() => {
                  if (!detail.workItemId) return;
                  setSelected([String(detail.workItemId)]);
                  setDetail(null);
                  setReason("");
                  setDialog("reassign");
                }}
              />
            ) : dialog === "teams" ? (
              <>
                <h2>Carga por equipo</h2>
                <p>Distribución de tareas operativas persistidas.</p>
                <div className={styles.teamDetail}>
                  {snapshot.teamLoad.map((t, i) => (
                    <div key={i}>
                      <strong>{teams.find(([id]) => id === t.team)?.[1] ?? t.team}</strong>
                      <span>{t.assigneeName}</span>
                      <b>
                        {t.active} activas · {t.overdue} vencidas · {t.blockers} bloqueos
                      </b>
                    </div>
                  ))}
                </div>
              </>
            ) : dialog === "alerts" ? (
              <>
                <h2>Alertas operativas</h2>
                {alerts.map((a) => (
                  <Link
                    className={styles.alertDetail}
                    key={a.title}
                    href={a.href ?? href({ queue: a.queue, page: 1, ...a.extra })}
                  >
                    <a.icon color={a.color} />
                    <span>
                      <strong>{a.title}</strong>
                      <p>{a.copy}</p>
                    </span>
                    <ChevronRight size={18} />
                  </Link>
                ))}
              </>
            ) : (
              <>
                <h2>
                  {dialog === "take"
                    ? "Tomar tareas"
                    : dialog === "reassign"
                      ? "Reasignar tareas"
                      : "Resolver seguimientos"}
                </h2>
                <p>
                  {selected.length} tareas seleccionadas.{" "}
                  {dialog === "resolve"
                    ? "Se completarán los seguimientos seleccionados y quedará registro del cambio."
                    : dialog === "take"
                      ? "Las tareas se asignarán a tu usuario."
                      : "El cambio de responsable quedará registrado con su motivo."}
                </p>
                {dialog === "reassign" && (
                  <>
                    <label>
                      Nuevo responsable
                      <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                        <option value="">Sin asignar</option>
                        {filterOptions.sellers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Motivo de reasignación
                      <textarea
                        maxLength={500}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Explica el motivo del cambio"
                      />
                    </label>
                  </>
                )}
                {message && (
                  <p role="alert" className={styles.notice}>
                    {message}
                  </p>
                )}
                <div className={styles.dialogFooter}>
                  <button disabled={busy} onClick={() => setDialog(null)}>
                    Cancelar
                  </button>
                  <button
                    className={styles.primary}
                    disabled={busy || !selected.length || (dialog === "reassign" && !reason.trim())}
                    onClick={() => void runAction()}
                  >
                    {busy ? "Guardando…" : "Confirmar"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
