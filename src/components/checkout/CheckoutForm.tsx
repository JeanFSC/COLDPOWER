"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Building2, Check, LoaderCircle, Lock, MapPin, Package, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { formatProductPrice } from "@/lib/formatters";
import type { CartView } from "@/lib/shopping-cart-service";

type Location = { id: string; name: string; address: string | null; city: string | null };
type Method = "PICKUP" | "DELIVERY" | "SHIPPING";
type Props = { cart: CartView; locations: Location[]; defaults: { name: string; email: string; phone: string } };
type CheckoutResult = { success: boolean; message?: string; code?: string; order?: { code: string; total: string; currency: string }; paymentUrl?: string | null; paymentError?: string };

const steps = ["Entrega", "Contacto", "Revisión y pago"] as const;
const methods: Array<{ value: Method; title: string; description: string; icon: typeof Package }> = [
  { value: "PICKUP", title: "Recojo en tienda", description: "Recoges en el local elegido cuando el pedido esté listo.", icon: Building2 },
  { value: "DELIVERY", title: "Delivery en Lima", description: "Entregamos en tu dirección de Lima Metropolitana.", icon: Truck },
  { value: "SHIPPING", title: "Envío a provincia", description: "Despachamos por agencia de transporte a tu ciudad.", icon: Package },
];

const inputClass = "h-11 w-full rounded-md border border-border bg-white px-3 text-sm font-medium text-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-dark">
      {label}
      {children}
      {hint ? <span className="text-xs font-medium text-gray-text">{hint}</span> : null}
    </label>
  );
}

export function CheckoutForm({ cart, locations, defaults }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    deliveryMethod: "PICKUP" as Method,
    locationId: locations[0]?.id ?? "",
    address: "",
    district: "",
    reference: "",
    department: "",
    province: "",
    agencyName: "",
    recipientName: "",
    recipientDocument: "",
    name: defaults.name,
    phone: defaults.phone,
    email: defaults.email,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<CheckoutResult["order"] | null>(null);
  const currency = cart.currency ?? "PEN";
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  if (!cart.items.length) {
    return (
      <section className="rounded-lg border border-border bg-white p-6 shadow-card">
        <ShoppingBag className="h-9 w-9 text-brand-secondary-600" aria-hidden="true" />
        <h2 className="mt-4 font-display text-2xl font-black text-dark">Tu carrito está vacío</h2>
        <p className="mt-2 text-sm leading-6 text-gray-text">Agrega productos con precio publicado para comprar en línea.</p>
        <div className="mt-5 flex flex-wrap gap-3"><Button href="/catalogo" variant="primary">Ver catálogo</Button><Button href="/cuenta/pedidos" variant="outline">Mis pedidos</Button></div>
      </section>
    );
  }
  if (!cart.canCheckout) {
    return (
      <section className="rounded-lg border border-warning/30 bg-warning/10 p-6 text-sm leading-6 text-dark" role="alert">
        <AlertTriangle className="mb-2 h-6 w-6 text-warning" aria-hidden="true" />
        Tu carrito tiene productos que no se pueden pagar ahora (sin precio, retirados o en otra moneda). <Link href="/carrito" className="font-extrabold text-brand-secondary-600 underline">Revisa tu carrito</Link>.
      </section>
    );
  }
  if (!locations.length) {
    return <section className="rounded-lg border border-warning/30 bg-warning/10 p-6 text-sm text-dark" role="alert"><MapPin className="mb-2 h-5 w-5 text-warning" aria-hidden="true" />No hay locales activos para atender pedidos en este momento.</section>;
  }

  function validateStep(target: number) {
    if (target >= 1) {
      if (!form.locationId) return "Selecciona un local.";
      if (form.deliveryMethod === "DELIVERY" && (!form.address.trim() || !form.district.trim())) return "Completa la dirección y el distrito de entrega.";
      if (form.deliveryMethod === "SHIPPING" && (!form.department.trim() || !form.province.trim() || !form.agencyName.trim() || !form.recipientName.trim() || !form.recipientDocument.trim())) return "Completa destino, agencia y quién recoge el envío.";
    }
    if (target >= 2) {
      if (!form.name.trim() || !form.phone.trim()) return "Nombre y teléfono son obligatorios.";
      if (!/^[+\d][\d\s-]{6,19}$/.test(form.phone.trim())) return "Revisa el teléfono.";
    }
    return "";
  }

  function goTo(target: number) {
    const message = target > step ? validateStep(target) : "";
    setError(message);
    if (!message) setStep(target);
  }

  async function pay() {
    const message = validateStep(2);
    if (message) { setError(message); return; }
    setSubmitting(true);
    setError("");
    try {
      const details = form.deliveryMethod === "DELIVERY"
        ? { district: form.district, reference: form.reference }
        : form.deliveryMethod === "SHIPPING"
          ? { department: form.department, province: form.province, agencyName: form.agencyName, recipientName: form.recipientName, recipientDocument: form.recipientDocument, reference: form.reference }
          : null;
      const response = await fetch("/api/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryMethod: form.deliveryMethod, locationId: form.locationId, name: form.name, phone: form.phone, email: form.email, address: form.deliveryMethod === "PICKUP" ? null : form.address, deliveryDetails: details }),
      });
      const result = (await response.json().catch(() => ({ success: false }))) as CheckoutResult;
      if (response.status === 401) { window.location.assign("/sign-in?redirect_url=%2Fcheckout"); return; }
      if (!response.ok || !result.success || !result.order) { setError(result.message ?? "No se pudo crear el pedido."); return; }
      if (result.paymentUrl) { window.location.assign(result.paymentUrl); return; }
      setPendingOrder(result.order);
      setError(result.paymentError ?? "El pedido se creó, pero no se pudo iniciar el pago.");
    } catch {
      setError("No hay conexión. Tu carrito sigue intacto; inténtalo nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (pendingOrder) {
    return (
      <section className="rounded-lg border border-border bg-white p-6 shadow-card sm:p-8">
        <Check className="h-10 w-10 text-teal" aria-hidden="true" />
        <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.16em] text-teal">Pedido registrado</p>
        <h2 className="mt-2 font-display text-3xl font-black text-dark">{pendingOrder.code}</h2>
        <p className="mt-3 text-sm leading-6 text-danger" role="alert">{error}</p>
        <p className="mt-2 text-sm leading-6 text-gray-text">Tu stock está reservado. Puedes reintentar el pago desde el detalle del pedido.</p>
        <Button href={`/cuenta/pedidos/${encodeURIComponent(pendingOrder.code)}`} variant="primary" className="mt-5">Ir al pedido</Button>
      </section>
    );
  }

  const selectedLocation = locations.find((location) => location.id === form.locationId);
  const method = methods.find((option) => option.value === form.deliveryMethod)!;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="min-w-0 rounded-lg border border-border bg-white p-5 shadow-card sm:p-7">
        <ol className="flex flex-wrap items-center gap-2 text-sm font-bold" aria-label="Pasos del checkout">
          {steps.map((label, index) => (
            <li key={label} className="flex items-center gap-2">
              <button type="button" className={index === step ? "inline-flex items-center gap-2 rounded-pill bg-dark px-3 py-1.5 text-white" : index < step ? "inline-flex items-center gap-2 rounded-pill bg-brand-secondary-600/10 px-3 py-1.5 text-brand-secondary-600" : "inline-flex items-center gap-2 rounded-pill bg-background px-3 py-1.5 text-gray-text"} aria-current={index === step ? "step" : undefined} disabled={index > step} onClick={() => goTo(index)}>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">{index < step ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}</span>
                {label}
              </button>
              {index < steps.length - 1 ? <span className="h-px w-4 bg-border" aria-hidden="true" /> : null}
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <div className="mt-6">
            <h2 className="font-display text-2xl font-black text-dark">¿Cómo recibes tu pedido?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Método de entrega">
              {methods.map((option) => {
                const Icon = option.icon;
                const active = form.deliveryMethod === option.value;
                return (
                  <button key={option.value} type="button" role="radio" aria-checked={active} onClick={() => update("deliveryMethod", option.value)} className={active ? "rounded-lg border-2 border-brand-secondary-600 bg-brand-secondary-600/5 p-4 text-left" : "rounded-lg border border-border bg-white p-4 text-left hover:border-brand-secondary-600/50"}>
                    <Icon className={active ? "h-6 w-6 text-brand-secondary-600" : "h-6 w-6 text-gray-text"} aria-hidden="true" />
                    <p className="mt-2 font-extrabold text-dark">{option.title}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-text">{option.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 grid gap-4">
              <Field label={form.deliveryMethod === "PICKUP" ? "Local de recojo" : "Despachamos desde"} hint="El stock se reserva en este local.">
                <select value={form.locationId} onChange={(event) => update("locationId", event.target.value)} className={inputClass}>
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.name}{location.address ? ` · ${location.address}` : ""}</option>)}
                </select>
              </Field>
              {form.deliveryMethod === "DELIVERY" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Field label="Dirección de entrega"><input value={form.address} onChange={(event) => update("address", event.target.value)} className={inputClass} autoComplete="street-address" placeholder="Av., calle, número, dpto." /></Field></div>
                  <Field label="Distrito"><input value={form.district} onChange={(event) => update("district", event.target.value)} className={inputClass} placeholder="Ej. Miraflores" /></Field>
                  <Field label="Referencia (opcional)"><input value={form.reference} onChange={(event) => update("reference", event.target.value)} className={inputClass} placeholder="Frente al parque…" /></Field>
                </div>
              ) : null}
              {form.deliveryMethod === "SHIPPING" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Departamento"><input value={form.department} onChange={(event) => update("department", event.target.value)} className={inputClass} placeholder="Ej. Arequipa" /></Field>
                  <Field label="Provincia"><input value={form.province} onChange={(event) => update("province", event.target.value)} className={inputClass} placeholder="Ej. Arequipa" /></Field>
                  <Field label="Agencia de transporte"><input value={form.agencyName} onChange={(event) => update("agencyName", event.target.value)} className={inputClass} placeholder="Ej. Shalom, Olva, Marvisur" /></Field>
                  <Field label="Dirección de la agencia (opcional)"><input value={form.address} onChange={(event) => update("address", event.target.value)} className={inputClass} /></Field>
                  <Field label="Quién recoge"><input value={form.recipientName} onChange={(event) => update("recipientName", event.target.value)} className={inputClass} autoComplete="name" /></Field>
                  <Field label="DNI de quien recoge"><input value={form.recipientDocument} onChange={(event) => update("recipientDocument", event.target.value)} className={inputClass} inputMode="numeric" /></Field>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-6">
            <h2 className="font-display text-2xl font-black text-dark">Datos de contacto</h2>
            <p className="mt-2 text-sm text-gray-text">Te escribiremos sobre el estado del pedido y la coordinación de entrega.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre completo"><input value={form.name} onChange={(event) => update("name", event.target.value)} className={inputClass} autoComplete="name" /></Field>
              <Field label="Teléfono / WhatsApp"><input value={form.phone} onChange={(event) => update("phone", event.target.value)} className={inputClass} autoComplete="tel" inputMode="tel" /></Field>
              <div className="sm:col-span-2"><Field label="Correo"><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className={inputClass} autoComplete="email" /></Field></div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-6">
            <h2 className="font-display text-2xl font-black text-dark">Revisa y paga</h2>
            <dl className="mt-5 grid gap-4 rounded-md border border-border bg-background p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs font-extrabold uppercase tracking-[0.12em] text-gray-text">Entrega</dt><dd className="mt-1 font-bold text-dark">{method.title}</dd><dd className="text-gray-text">{form.deliveryMethod === "PICKUP" ? `${selectedLocation?.name ?? ""}${selectedLocation?.address ? ` · ${selectedLocation.address}` : ""}` : form.deliveryMethod === "DELIVERY" ? `${form.address}, ${form.district}` : `${form.agencyName} · ${form.province}, ${form.department}`}</dd></div>
              <div><dt className="text-xs font-extrabold uppercase tracking-[0.12em] text-gray-text">Contacto</dt><dd className="mt-1 font-bold text-dark">{form.name}</dd><dd className="text-gray-text">{form.phone}{form.email ? ` · ${form.email}` : ""}</dd></div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-gray-text">Reservamos el stock por un tiempo limitado mientras completas el pago. {form.deliveryMethod === "PICKUP" ? "" : "El costo de envío se coordina después del pago."}</p>
          </div>
        ) : null}

        {error ? <p className="mt-5 rounded-md border border-danger/25 bg-danger/10 p-3 text-sm font-semibold text-danger" role="alert">{error}</p> : null}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          {step > 0 ? <Button type="button" variant="ghost" onClick={() => goTo(step - 1)} disabled={submitting}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Atrás</Button> : <Button href="/carrito" variant="ghost"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Volver al carrito</Button>}
          {step < 2 ? (
            <Button type="button" variant="primary" onClick={() => goTo(step + 1)}>Continuar<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
          ) : (
            <Button type="button" variant="primary" size="lg" onClick={() => void pay()} disabled={submitting}>
              {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Lock className="h-5 w-5" aria-hidden="true" />}
              {submitting ? "Reservando stock…" : `Pagar ${cart.tax.total ? formatProductPrice(Number(cart.tax.total), currency) : cart.subtotal ? formatProductPrice(Number(cart.subtotal), currency) : ""}`}
            </Button>
          )}
        </div>
      </section>

      <aside className="cp-texture-dark h-fit rounded-lg border border-brand-primary-900 p-5 text-white shadow-float max-lg:sticky max-lg:bottom-0 max-lg:z-20 sm:p-6 lg:sticky lg:top-28" aria-label="Resumen del pedido">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-action-accent-500">Tu pedido</p>
        <ul className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-3">
          {cart.items.map((item) => (
            <li key={item.productId} className="flex min-w-0 justify-between gap-4 border-b border-white/10 pb-3 text-sm">
              <span className="min-w-0"><strong className="block truncate">{item.name}</strong><span className="text-gray-light">{item.quantity} × {item.unitPrice ? formatProductPrice(Number(item.unitPrice), item.currency ?? currency) : "—"}</span></span>
              <span className="shrink-0 font-bold">{item.lineTotal ? formatProductPrice(Number(item.lineTotal), item.currency ?? currency) : "—"}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between text-sm"><span className="text-gray-light">Envío</span><span className="font-bold">{form.deliveryMethod === "PICKUP" ? "Sin costo" : "Por coordinar"}</span></div>
        {cart.tax.status === "CONFIGURED" ? <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between"><span className="text-gray-light">Op. gravada</span><span className="font-bold">{formatProductPrice(Number(cart.tax.taxableOperation), currency)}</span></div>
          <div className="flex justify-between"><span className="text-gray-light">IGV {cart.tax.rate}%</span><span className="font-bold">{formatProductPrice(Number(cart.tax.igv), currency)}</span></div>
        </div> : null}
        <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4">
          <span className="text-sm text-gray-light">Total</span>
          <strong className="font-display text-3xl">{cart.tax.total ? formatProductPrice(Number(cart.tax.total), currency) : cart.subtotal ? formatProductPrice(Number(cart.subtotal), currency) : "—"}</strong>
        </div>
        <p className="mt-4 text-xs leading-5 text-gray-light">Los precios se verifican otra vez al confirmar. No guardamos datos de tarjeta.</p>
      </aside>
    </div>
  );
}
