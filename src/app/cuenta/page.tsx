import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  LockKeyhole,
  Package,
  ReceiptText,
  Search,
  Sparkles,
  Truck,
  UserRound,
} from "lucide-react";
import { AccountProfileEditor } from "@/components/account/AccountProfileEditor";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { AddToQuoteButton } from "@/components/cart/AddToQuoteButton";
import { requireUser } from "@/lib/auth";
import { emptyAccountOverview } from "@/lib/account-overview";
import { getAccountHubData, type AccountAttention, type AccountHubData } from "@/lib/account-hub";
import { getPublicCompanySettings } from "@/lib/company-settings-runtime";
import { listPurchasedProductsForUser } from "@/lib/customer-history";
import { formatMoney } from "@/lib/order-display";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mi cuenta | ColdPower",
  description: "Retoma tus cotizaciones, pedidos y pagos reales de ColdPower.",
  robots: { index: false, follow: false },
};

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Lima",
});

const accountLabels = {
  activity: "Actividad reciente",
  quoteCart: "Carrito de cotización",
};

function formatDate(value: Date | null) {
  return value ? dateFormatter.format(value).replace(/\.$/, "") : null;
}

function AttentionIcon({ kind }: { kind: AccountAttention["kind"] }) {
  if (kind === "quote") return <FileText aria-hidden="true" />;
  if (kind === "payment") return <CreditCard aria-hidden="true" />;
  return <Truck aria-hidden="true" />;
}

function AttentionCard({ item }: { item: AccountAttention }) {
  const actionHref = item.kind === "payment" ? "/cuenta/pagos" : item.href;
  const extraDate = item.validUntil
    ? ` Vence ${formatDate(item.validUntil)}.`
    : item.estimatedDeliveryAt
      ? ` Estimada ${formatDate(item.estimatedDeliveryAt)}.`
      : "";
  return (
    <article className={`account-attention-card is-${item.kind}`}>
      <div className="account-attention-main">
        <span className="account-attention-icon"><AttentionIcon kind={item.kind} /></span>
        <div className="min-w-0">
          <strong className="account-attention-title">{item.title}</strong>
          <span className="account-attention-reference">{item.reference}</span>
        </div>
      </div>
      <span className="account-attention-description">{item.description}{extraDate}</span>
      <Link href={actionHref} className="account-attention-action">
        {item.action}
        <ArrowRight aria-hidden="true" />
      </Link>
    </article>
  );
}

function statusClass(status: string) {
  if (["DELIVERED", "APPROVED", "CONFIRMED", "convertida", "aprobada"].includes(status)) return "is-success";
  if (["PAYMENT_PENDING", "PENDING", "UNDER_REVIEW", "REJECTED"].includes(status)) return "is-warning";
  return "";
}

function CurrentOrder({ order }: { order: NonNullable<AccountHubData["currentOrder"]> }) {
  const deliveryText = order.estimatedDeliveryAt
    ? `Entrega estimada · ${formatDate(order.estimatedDeliveryAt)}`
    : order.location
      ? `Entrega a domicilio · ${order.location}`
      : "Seguimiento actualizado";
  const footerText = order.location
    ? `Entrega a domicilio · ${order.location}`
    : order.estimatedDeliveryAt
      ? deliveryText
      : "Entrega a domicilio · Seguimiento actualizado";
  return (
    <article className="account-live-card">
      <div className="account-live-head">
        <div className="min-w-0">
          <p className="account-mono">{order.code}</p>
          <h3 className="account-live-title">{order.title}</h3>
          <p className="account-live-meta"><Package aria-hidden="true" /> Actualizado {formatDate(order.updatedAt)}</p>
        </div>
        <span className="account-status-pill">{order.statusLabel}</span>
      </div>
      <div className="account-timeline" aria-label={`Avance del pedido ${order.code}`}>
        {order.timeline.map((step) => (
          <div key={step.status} className={`account-timeline-step is-${step.state}`}>
            <span className="account-timeline-dot">{step.state === "done" ? <Check aria-hidden="true" /> : step.state === "current" ? <Truck aria-hidden="true" /> : null}</span>
            <span className="account-timeline-label">{step.label}</span>
          </div>
        ))}
      </div>
      <div className="account-live-footer">
        <span>{order.deliveryMethod === "PICKUP" ? <><strong>Recojo en tienda</strong>{order.location ? ` · ${order.location}` : ""}</> : footerText}</span>
        <Link href={`/cuenta/pedidos/${encodeURIComponent(order.code)}`}>Ver detalle <ArrowRight aria-hidden="true" /></Link>
      </div>
    </article>
  );
}

function RecentQuotes({ data }: { data: AccountHubData }) {
  if (!data.recentQuotes.length) return null;
  return (
    <article className="account-list-card">
      <div className="account-list-card-head">
        <div>
          <p className="account-eyebrow">Últimas solicitudes</p>
          <h2>Cotizaciones recientes</h2>
        </div>
        <Link href="/cuenta/cotizaciones" className="account-section-link">Ver todas <ArrowRight aria-hidden="true" /></Link>
      </div>
      {data.recentQuotes.map((quote) => (
        <Link href="/cuenta/cotizaciones" className="account-list-row" key={quote.id}>
          <div className="account-list-row-main">
            <p className="account-list-row-title">{quote.title}</p>
            <p className="account-list-row-meta"><span className="account-mono">{quote.reference}</span>{quote.validUntil ? `Vence ${formatDate(quote.validUntil)}` : `Actualizada ${formatDate(quote.updatedAt)}`}</p>
          </div>
          <span className={`account-list-row-status ${statusClass(quote.status)}`}>{quote.statusLabel}</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      ))}
    </article>
  );
}

function RecentOrders({ data }: { data: AccountHubData }) {
  if (!data.recentOrders.length) return null;
  return (
    <article className="account-list-card">
      <div className="account-list-card-head">
        <div>
          <p className="account-eyebrow">Compras confirmadas</p>
          <h2>Pedidos recientes</h2>
        </div>
        <Link href="/cuenta/pedidos" className="account-section-link">Ver todos <ArrowRight aria-hidden="true" /></Link>
      </div>
      {data.recentOrders.map((order) => (
        <Link href={`/cuenta/pedidos/${encodeURIComponent(order.code)}`} className="account-list-row" key={order.id}>
          <div className="account-list-row-main">
            <p className="account-list-row-title">{order.title}</p>
            <p className="account-list-row-meta"><span className="account-mono">{order.code}</span>{formatMoney(order.total, order.currency)}</p>
          </div>
          <span className={`account-list-row-status ${statusClass(order.status)}`}>{order.statusLabel}</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      ))}
    </article>
  );
}

function RepeatPurchase({ products }: { products: Awaited<ReturnType<typeof listPurchasedProductsForUser>> }) {
  if (!products.length) return null;
  return (
    <section className="account-repeat-section" aria-labelledby="account-repeat-title">
      <div className="account-section-head">
        <div>
          <p className="account-eyebrow">Historial de compras</p>
          <h2 id="account-repeat-title" className="account-section-title">Volver a comprar</h2>
        </div>
        <Link href="/cuenta/historial" className="account-section-link">Ver historial <ArrowRight aria-hidden="true" /></Link>
      </div>
      <div className="account-repeat-grid">
        {products.slice(0, 3).map((product) => (
          <article className="account-repeat-card" key={product.productId}>
            <span className="account-repeat-card-icon"><Package aria-hidden="true" /></span>
            <div className="account-repeat-copy">
              <strong title={product.name}>{product.name}</strong>
              <small>{product.sku} · comprado {product.totalQuantity} veces</small>
              {product.price ? <span className="account-repeat-price">{formatMoney(product.price.amount, product.price.currency)}</span> : null}
            </div>
            {product.price ? (
              <AddToCartButton productId={product.productId} purchasable label="Agregar al carrito" size="sm" className="account-repeat-action" />
            ) : (
              <AddToQuoteButton productId={product.productId} label="Cotizar" size="sm" className="account-repeat-action is-outline" />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function EmptyAccount({ firstName, profile, whatsapp }: { firstName: string | null; profile: AccountHubData["overview"]["profile"]; whatsapp: string | null }) {
  const whatsappDigits = whatsapp?.replace(/\D/g, "") || "";
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null;
  return (
    <>
      <header className="account-hub-header">
        <div>
          <p className="account-eyebrow">Tu espacio ColdPower</p>
          <h1 className="account-h1">Tu cuenta está lista{firstName ? `, ${firstName}` : ""}.</h1>
          <p className="account-subtitle">Cuando encuentres una referencia, aquí podrás seguir cada paso sin perder el hilo.</p>
        </div>
        <span className="account-status-pill"><CheckCircle2 aria-hidden="true" /> Cuenta activa</span>
      </header>

      <section className="account-empty-panel mt-3" aria-labelledby="account-start-title">
        <div className="account-empty-heading">
          <span className="account-empty-icon"><Sparkles aria-hidden="true" /></span>
          <div>
            <p className="account-eyebrow">Primeros pasos</p>
            <h2 id="account-start-title">Empieza por lo que necesitas resolver</h2>
            <p>Aún no tienes pedidos ni cotizaciones asociadas. Estas son las tres rutas útiles para comenzar.</p>
          </div>
        </div>
        <div className="account-start-grid">
          <Link href="/catalogo" className="account-start-card">
            <span className="account-start-top"><span className="account-start-number">01</span><span className="account-start-icon"><Search aria-hidden="true" /></span><strong>Busca por código o modelo</strong></span>
            <p>Encuentra la referencia exacta en el catálogo técnico.</p>
            <span className="account-start-arrow">Explorar <ArrowRight aria-hidden="true" /></span>
          </Link>
          <Link href="/cotizacion" className="account-start-card">
            <span className="account-start-top"><span className="account-start-number">02</span><span className="account-start-icon"><FileText aria-hidden="true" /></span><strong>Pide una cotización</strong></span>
            <p>Envíanos el producto, modelo o una foto del equipo.</p>
            <span className="account-start-arrow">Solicitar <ArrowRight aria-hidden="true" /></span>
          </Link>
          <Link href="/cuenta/datos" className="account-start-card">
            <span className="account-start-top"><span className="account-start-number">03</span><span className="account-start-icon"><UserRound aria-hidden="true" /></span><strong>Completa tus datos para facturar</strong></span>
            <p>Guarda tu RUC, teléfono y dirección de entrega.</p>
            <span className="account-start-arrow">Completar <ArrowRight aria-hidden="true" /></span>
          </Link>
        </div>
        <span className="sr-only">{accountLabels.quoteCart}</span>
      </section>

      {whatsappHref ? (
        <section className="account-help-banner" aria-label="Asesoría técnica">
          <div className="account-help-copy">
            <span className="account-help-icon"><span aria-hidden="true">◔</span></span>
            <div><p className="account-eyebrow text-[#9be7c2]">Asesoría técnica</p><strong>¿No sabes qué repuesto necesitas?</strong><span>Un asesor puede ayudarte a ubicarlo con el modelo o una foto del equipo.</span></div>
          </div>
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="account-help-link">Solicitar ayuda por WhatsApp <ArrowRight aria-hidden="true" /></a>
        </section>
      ) : null}

      <p className="account-privacy-note"><LockKeyhole aria-hidden="true" /><span><strong>Tus datos quedan asociados a tu cuenta.</strong> El cliente comercial se determina en servidor y solo tú podrás ver tus pedidos, cotizaciones y pagos.</span></p>
      <span className="sr-only">{profile.email || ""}</span>
    </>
  );
}

export default async function CuentaPage() {
  const { userId, role } = await requireUser();
  const companySettings = await getPublicCompanySettings();
  let data: AccountHubData = {
    overview: emptyAccountOverview(role),
    attention: [],
    currentOrder: null,
    recentQuotes: [],
    recentOrders: [],
  };
  let products: Awaited<ReturnType<typeof listPurchasedProductsForUser>> = [];

  try {
    data = await getAccountHubData(userId, role);
    products = await listPurchasedProductsForUser(userId);
  } catch (error) {
    console.error("ColdPower: no se pudo cargar el hub de cuenta", error);
  }

  const { overview } = data;
  const { profile } = overview;
  const firstName = profile.firstName || profile.name?.trim()?.split(/\s+/)[0] || null;
  const hasActivity = overview.counts.quotes > 0 || overview.counts.orders > 0 || overview.counts.payments > 0 || overview.counts.quoteCartItems > 0;

  if (!hasActivity) {
    return <EmptyAccount firstName={firstName} profile={profile} whatsapp={companySettings.whatsapp ?? null} />;
  }

  return (
    <div className="account-subpage" aria-label={accountLabels.activity}>
      <header className="account-hub-header">
        <div>
          <p className="account-eyebrow">Resumen de cuenta</p>
          <h1 className="account-h1">Hola{firstName ? `, ${firstName}` : ""}</h1>
          <p className="account-subtitle">Retoma tus cotizaciones, sigue tus pedidos y vuelve a comprar lo que ya conoces.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AccountProfileEditor profile={profile} buttonLabel="Ver mis datos" />
        </div>
      </header>

      {!overview.billing.hasCompleteData ? (
        <div className="account-billing-banner">
          <div className="account-billing-copy">
            <span className="account-billing-icon"><ReceiptText aria-hidden="true" /></span>
            <div><strong>Completa tus datos para facturar</strong><span>Agrega tu RUC o dirección de entrega para agilizar tus próximas compras.</span></div>
          </div>
          <Link href="/cuenta/datos" className="account-billing-action">Completar datos <ArrowRight aria-hidden="true" /></Link>
        </div>
      ) : null}

      {data.attention.length ? (
        <section className="account-section" aria-labelledby="account-attention-title">
          <div className="account-section-head"><div><p className="account-eyebrow">Prioridad</p><h2 id="account-attention-title" className="account-section-title">Lo que requiere tu atención</h2></div><span className="text-xs font-bold text-gray-text">{data.attention.length} {data.attention.length === 1 ? "acción abierta" : "acciones abiertas"}</span></div>
          <div className="account-attention-grid">{data.attention.map((item) => <AttentionCard item={item} key={item.id} />)}</div>
        </section>
      ) : null}

      {data.currentOrder ? (
        <section className="account-section" aria-labelledby="account-live-title">
          <div className="account-section-head"><div><p className="account-eyebrow">Seguimiento en vivo</p><h2 id="account-live-title" className="account-section-title">Pedido en curso</h2></div><Link href="/cuenta/pedidos" className="account-section-link">Ver mis pedidos <ArrowRight aria-hidden="true" /></Link></div>
          <CurrentOrder order={data.currentOrder} />
        </section>
      ) : null}

      <section className="account-dual-grid" aria-label="Actividad reciente">
        <RecentQuotes data={data} />
        <RecentOrders data={data} />
      </section>

      <RepeatPurchase products={products} />
      <Link href="/cuenta/pagos" className="sr-only">Ver pagos</Link>
    </div>
  );
}
