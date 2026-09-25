"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ClipboardList, PackageCheck, Truck } from "lucide-react";
import { AdminSelect } from "@/components/admin/AdminSelect";

type Supplier = { id: string; name: string; currency: string; status: string };
type Location = { id: string; name: string };
type Product = { id: string; sku: string; name: string };
type Purchase = {
  id: string;
  code: string;
  supplierId: string;
  locationId: string;
  status: string;
  currency: string;
  subtotal: string;
};

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const textareaClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-xs shadow-blue-500/25 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

async function post(path: string, body: unknown, idempotencyKey?: string) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { error?: string | { message?: string } };
  if (!response.ok) {
    const error = typeof result.error === "string" ? result.error : result.error?.message;
    throw new Error(error || "No se pudo guardar.");
  }
  return result;
}

function StepBadge({ index, label, active = false }: { index: number; label: string; active?: boolean }) {
  return (
    <span aria-label={`${index}. ${label}`} className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
          active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700"
        }`}
      >
        {index}
      </span>
      {label}
    </span>
  );
}

function StepHeading({
  number,
  eyebrow,
  title,
  icon: Icon,
}: {
  number: string;
  eyebrow: string;
  title: string;
  icon: typeof ClipboardList;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
        {number}
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-600">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {eyebrow}
        </p>
        <h3 className="mt-1 text-[15px] font-bold tracking-tight text-slate-900">{title}</h3>
      </div>
    </div>
  );
}

function DependencyNote({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning";
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-[11px] font-medium leading-5 ${
        tone === "warning"
          ? "border-amber-100 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      {children}
    </div>
  );
}

export function PurchasesOperations({
  suppliers,
  locations,
  products,
  purchases,
  canManage = true,
  canReceive = true,
  initialRequestProductId,
  initialRequestLocationId,
}: {
  suppliers: Supplier[];
  locations: Location[];
  products: Product[];
  purchases: Purchase[];
  canManage?: boolean;
  canReceive?: boolean;
  initialRequestProductId?: string;
  initialRequestLocationId?: string;
}) {
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [busy, setBusy] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<Product[]>(products);
  const [requestProductQuery, setRequestProductQuery] = useState("");
  const [requestProductOptions, setRequestProductOptions] = useState<Product[]>(products);

  const [requestLocationId, setRequestLocationId] = useState(initialRequestLocationId ?? "");
  const [requestSource, setRequestSource] = useState("MANUAL");
  const [requestProductId, setRequestProductId] = useState(initialRequestProductId ?? "");
  const [orderSupplierId, setOrderSupplierId] = useState("");
  const [orderLocationId, setOrderLocationId] = useState("");
  const [orderProductId, setOrderProductId] = useState("");
  const [receptionPurchaseId, setReceptionPurchaseId] = useState("");
  const [receptionProductId, setReceptionProductId] = useState("");

  const activeSuppliers = suppliers.filter((supplier) => supplier.status === "ACTIVE");
  const pendingPurchases = purchases.filter(
    (purchase) => purchase.status === "PENDING" || purchase.status === "PARTIAL_RECEIVED",
  );
  const displayedProductOptions = productQuery.trim().length < 2 ? products : productOptions;
  const displayedRequestProductOptions =
    requestProductQuery.trim().length < 2 ? products : requestProductOptions;
  const orderDependenciesReady =
    suppliers.length > 0 && locations.length > 0 && displayedProductOptions.length > 0;
  const requestDependenciesReady =
    locations.length > 0 && displayedRequestProductOptions.length > 0;
  const requestReady = requestDependenciesReady && requestLocationId !== "" && requestProductId !== "";
  const orderReady =
    orderDependenciesReady && orderSupplierId !== "" && orderLocationId !== "" && orderProductId !== "";
  const receptionReady =
    pendingPurchases.length > 0 &&
    displayedProductOptions.length > 0 &&
    receptionPurchaseId !== "" &&
    receptionProductId !== "";

  useEffect(() => {
    const query = productQuery.trim();
    if (query.length < 2) {
      return;
    }
    const controller = new AbortController();
    void fetch(`/api/admin/inventario/productos?query=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudieron buscar productos.");
        const result = (await response.json()) as { products?: Product[] };
        setProductOptions(result.products ?? []);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setProductOptions([]);
      });
    return () => controller.abort();
  }, [productQuery]);

  useEffect(() => {
    const query = requestProductQuery.trim();
    if (query.length < 2) return;
    const controller = new AbortController();
    void fetch(`/api/admin/inventario/productos?query=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudieron buscar productos.");
        const result = (await response.json()) as { products?: Product[] };
        setRequestProductOptions(result.products ?? []);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRequestProductOptions([]);
      });
    return () => controller.abort();
  }, [requestProductQuery]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
    path: string,
    transform: (data: Record<string, FormDataEntryValue>) => unknown,
    onSuccess?: () => void,
  ) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement && submitter.name)
      data[submitter.name] = submitter.value;
    try {
      await post(path, transform(data));
      setMessageTone("success");
      setMessage("Guardado. Recarga para ver los datos persistidos.");
      event.currentTarget.reset();
      setProductQuery("");
      setRequestProductQuery("");
      onSuccess?.();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function submitSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setBusy(true);
    setMessage("");
    try {
      const params = new URLSearchParams({
        name: String(data.name ?? ""),
        country: String(data.country ?? ""),
      });
      if (data.identification) params.set("identification", String(data.identification));
      if (data.email) params.set("email", String(data.email));
      const duplicateResponse = await fetch(`/api/admin/proveedores?${params.toString()}`);
      const duplicatePayload = (await duplicateResponse.json().catch(() => ({}))) as {
        duplicates?: Array<{ name: string; country: string }>;
      };
      if (!duplicateResponse.ok) throw new Error("No se pudo validar duplicados.");
      if (duplicatePayload.duplicates?.length) {
        setMessageTone("error");
        setMessage(
          `No se creó: posible proveedor duplicado (${duplicatePayload.duplicates.map((item) => `${item.name} · ${item.country}`).join(", ")}).`,
        );
        return;
      }
      await post("/api/admin/proveedores", {
        name: data.name,
        identification: data.identification,
        country: data.country,
        contactName: data.contactName,
        whatsapp: data.whatsapp,
        email: data.email,
        address: data.address,
        currency: data.currency,
        notes: data.notes,
      });
      setMessageTone("success");
      setMessage("Proveedor guardado. Recarga para ver los datos persistidos.");
      form.reset();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el proveedor.");
    } finally {
      setBusy(false);
    }
  }

  const locationOptions = [
    { value: "", label: "Local de recepción" },
    ...locations.map((location) => ({ value: location.id, label: location.name })),
  ];
  const requestProductSelectOptions = [
    { value: "", label: "Producto solicitado" },
    ...displayedRequestProductOptions.map((product) => ({
      value: product.id,
      label: `${product.sku} · ${product.name}`,
    })),
  ];
  const orderProductSelectOptions = [
    { value: "", label: "Producto" },
    ...displayedProductOptions.map((product) => ({
      value: product.id,
      label: `${product.sku} · ${product.name}`,
    })),
  ];
  const receptionProductSelectOptions = [
    { value: "", label: "Producto recibido" },
    ...displayedProductOptions.map((product) => ({
      value: product.id,
      label: `${product.sku} · ${product.name}`,
    })),
  ];

  return (
    <section className="mt-4 space-y-4" aria-label="Flujo de compras">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-xs font-medium leading-5 text-slate-500">
          Completa los pasos en orden. Crear una orden no altera el inventario; solo una recepción
          validada registra el movimiento.
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <StepBadge index={1} label="Solicitud" active />
          <ArrowRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
          <StepBadge index={2} label="Proveedor" />
          <ArrowRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
          <StepBadge index={3} label="Orden" />
          <ArrowRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
          <StepBadge index={4} label="Recepción" />
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <form
          id="purchase-request-tools"
          onSubmit={(event) =>
            void submit(
              event,
              "/api/admin/compras/solicitudes",
              (data) => ({
                locationId: data.locationId,
                source: data.source,
                notes: data.notes,
                items: [
                  {
                    productId: data.productId,
                    quantity: Number(data.quantity),
                    notes: data.itemNotes,
                  },
                ],
              }),
              () => {
                setRequestLocationId("");
                setRequestSource("MANUAL");
                setRequestProductId("");
              },
            )
          }
          className={canManage ? "rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs" : "hidden"}
        >
          <StepHeading
            number="1"
            eyebrow="Solicitud"
            title="Define lo que hay que comprar"
            icon={ClipboardList}
          />
          <p className="mt-3 text-xs text-slate-500">
            Guarda una solicitud en borrador; no cambia el inventario y puede pasar por aprobación.
          </p>
          {!requestDependenciesReady ? (
            <div className="mt-3">
              <DependencyNote tone="warning">
                <strong>Antes de crear una solicitud:</strong> debe existir un local activo y un
                producto encontrado en el catálogo.
              </DependencyNote>
            </div>
          ) : null}
          <div className="mt-4 space-y-2">
            <AdminSelect
              name="locationId"
              ariaLabel="Local de recepción de la solicitud"
              value={requestLocationId}
              onValueChange={setRequestLocationId}
              options={locationOptions}
            />
            <AdminSelect
              name="source"
              ariaLabel="Origen de la solicitud"
              value={requestSource}
              onValueChange={setRequestSource}
              options={[
                { value: "MANUAL", label: "Origen manual" },
                { value: "STOCK_ALERT", label: "Alerta de stock" },
                { value: "REPLENISHMENT", label: "Reposición" },
                { value: "OTHER", label: "Otro" },
              ]}
            />
            <input
              value={requestProductQuery}
              onChange={(event) => setRequestProductQuery(event.currentTarget.value)}
              placeholder="Buscar producto por SKU o nombre (mín. 2 caracteres)"
              aria-label="Buscar producto para la solicitud"
              className={inputClass}
            />
            <AdminSelect
              name="productId"
              ariaLabel="Producto solicitado"
              value={requestProductId}
              onValueChange={setRequestProductId}
              options={requestProductSelectOptions}
            />
            <input
              required
              min="1"
              type="number"
              name="quantity"
              aria-label="Cantidad solicitada"
              placeholder="Cantidad solicitada"
              className={inputClass}
            />
            <input
              name="itemNotes"
              aria-label="Nota de la línea de solicitud"
              placeholder="Nota de la línea (opcional)"
              className={inputClass}
            />
            <textarea
              name="notes"
              aria-label="Nota general de la solicitud"
              placeholder="Nota general (opcional)"
              rows={2}
              className={textareaClass}
            />
          </div>
          <button disabled={busy || !requestReady} className={`mt-3 ${primaryButtonClass}`}>
            Guardar solicitud
          </button>
        </form>

        <form
          id="supplier-tools"
          onSubmit={(event) => void submitSupplier(event)}
          className={canManage ? "rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs" : "hidden"}
        >
          <StepHeading
            number="2"
            eyebrow="Proveedor"
            title="Registra el origen de compra"
            icon={Truck}
          />
          <p className="mt-3 text-xs text-slate-500">
            Primero registra un proveedor activo; después podrás crear una orden.
          </p>
          <div className="mt-4 space-y-2">
            <input
              required
              name="name"
              aria-label="Nombre comercial del proveedor"
              placeholder="Nombre comercial"
              className={inputClass}
            />
            <input
              name="identification"
              aria-label="RUC o identificación del proveedor"
              placeholder="RUC / identificación"
              className={inputClass}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                name="country"
                aria-label="País del proveedor"
                defaultValue="PE"
                maxLength={2}
                placeholder="País ISO"
                className={`${inputClass} uppercase`}
              />
              <input
                required
                name="currency"
                aria-label="Moneda del proveedor"
                defaultValue="PEN"
                maxLength={3}
                placeholder="Moneda"
                className={`${inputClass} uppercase`}
              />
            </div>
            <input
              name="contactName"
              aria-label="Contacto del proveedor"
              placeholder="Contacto"
              className={inputClass}
            />
            <input
              name="whatsapp"
              aria-label="WhatsApp del proveedor"
              placeholder="WhatsApp"
              className={inputClass}
            />
            <input
              type="email"
              name="email"
              aria-label="Correo del proveedor"
              placeholder="Correo"
              className={inputClass}
            />
            <input
              name="address"
              aria-label="Dirección del proveedor"
              placeholder="Dirección"
              className={inputClass}
            />
          </div>
          <button disabled={busy} className={`mt-3 ${primaryButtonClass}`}>
            Guardar proveedor
          </button>
        </form>

        <form
          id="purchase-order-tools"
          onSubmit={(event) =>
            void submit(
              event,
              "/api/admin/compras",
              (data) => ({
                supplierId: data.supplierId,
                locationId: data.locationId,
                currency: data.currency,
                createAs: data.createAs,
                expectedDeliveryAt: data.expectedDeliveryAt,
                items: [
                  {
                    productId: data.productId,
                    quantity: Number(data.quantity),
                    unitCost: data.unitCost,
                  },
                ],
              }),
              () => {
                setOrderSupplierId("");
                setOrderLocationId("");
                setOrderProductId("");
              },
            )
          }
          className={canManage ? "rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs" : "hidden"}
        >
          <StepHeading
            number="3"
            eyebrow="Orden de compra"
            title="Solicita el abastecimiento"
            icon={ClipboardList}
          />
          <p className="mt-3 text-xs text-slate-500">
            Selecciona proveedor, local y producto para dejar la orden pendiente de recepción.
          </p>
          {!orderDependenciesReady ? (
            <div className="mt-3">
              <DependencyNote tone="warning">
                <strong>Antes de crear una orden:</strong> registra al menos un proveedor, un local
                activo y un producto disponible.
              </DependencyNote>
            </div>
          ) : null}
          <div className="mt-4 space-y-2">
            <AdminSelect
              name="supplierId"
              ariaLabel="Proveedor de la orden de compra"
              value={orderSupplierId}
              onValueChange={setOrderSupplierId}
              options={[
                { value: "", label: "Proveedor" },
                ...activeSuppliers.map((supplier) => ({
                  value: supplier.id,
                  label: `${supplier.name} · ${supplier.currency}`,
                })),
              ]}
            />
            <AdminSelect
              name="locationId"
              ariaLabel="Local de recepción de la orden"
              value={orderLocationId}
              onValueChange={setOrderLocationId}
              options={locationOptions}
            />
            <input
              value={productQuery}
              onChange={(event) => setProductQuery(event.currentTarget.value)}
              placeholder="Buscar producto por SKU o nombre (mín. 2 caracteres)"
              aria-label="Buscar producto para la orden"
              className={inputClass}
            />
            <AdminSelect
              name="productId"
              ariaLabel="Producto de la orden de compra"
              value={orderProductId}
              onValueChange={setOrderProductId}
              options={orderProductSelectOptions}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                min="1"
                type="number"
                name="quantity"
                aria-label="Cantidad de la orden"
                placeholder="Cantidad"
                className={inputClass}
              />
              <input
                required
                min="0.01"
                step="0.01"
                name="unitCost"
                aria-label="Costo unitario de la orden"
                placeholder="Costo unitario"
                className={inputClass}
              />
            </div>
            <input
              required
              maxLength={3}
              name="currency"
              aria-label="Moneda de la orden"
              defaultValue="PEN"
              placeholder="Moneda"
              className={`${inputClass} uppercase`}
            />
            <label className="block text-[11px] font-semibold text-slate-500">
              Entrega esperada (opcional)
              <input
                type="datetime-local"
                name="expectedDeliveryAt"
                aria-label="Fecha y hora de entrega esperada"
                className={`mt-1 ${inputClass} font-normal text-slate-700`}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              name="createAs"
              value="DRAFT"
              disabled={busy || !orderReady}
              className={secondaryButtonClass}
            >
              Guardar borrador
            </button>
            <button
              name="createAs"
              value="PENDING"
              disabled={busy || !orderReady}
              className={primaryButtonClass}
            >
              Emitir OC
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Un borrador se puede emitir después; solo la recepción validada afecta inventario.
          </p>
        </form>

        <form
          onSubmit={(event) =>
            void submit(
              event,
              "/api/admin/compras/recepciones",
              (data) => ({
                purchaseId: data.purchaseId,
                items: [{ productId: data.productId, quantity: Number(data.quantity) }],
              }),
              () => {
                setReceptionPurchaseId("");
                setReceptionProductId("");
              },
            )
          }
          className="hidden"
        >
          <StepHeading
            number="4"
            eyebrow="Recepción"
            title="Ingresa lo recibido al inventario"
            icon={PackageCheck}
          />
          <p className="mt-3 max-w-2xl text-xs text-slate-500">
            Confirma cantidades recibidas para generar el movimiento transaccional correspondiente.
          </p>
          {!pendingPurchases.length ? (
            <div className="mt-3">
              <DependencyNote>
                <strong>No hay órdenes pendientes de recepción.</strong> Cuando una orden esté
                pendiente o parcialmente recibida, aparecerá en esta lista.
              </DependencyNote>
            </div>
          ) : null}
          <div className="mt-4 grid gap-2 md:grid-cols-[1.2fr_1.2fr_0.7fr_auto] md:items-end">
            <AdminSelect
              name="purchaseId"
              ariaLabel="Orden pendiente de recepción"
              value={receptionPurchaseId}
              onValueChange={setReceptionPurchaseId}
              options={[
                { value: "", label: "Orden pendiente" },
                ...pendingPurchases.map((purchase) => ({
                  value: purchase.id,
                  label: `${purchase.code} · ${purchase.currency} ${purchase.subtotal}`,
                })),
              ]}
            />
            <input
              value={productQuery}
              onChange={(event) => setProductQuery(event.currentTarget.value)}
              placeholder="Buscar producto por SKU o nombre"
              aria-label="Buscar producto recibido"
              className={inputClass}
            />
            <AdminSelect
              name="productId"
              ariaLabel="Producto recibido"
              value={receptionProductId}
              onValueChange={setReceptionProductId}
              options={receptionProductSelectOptions}
            />
            <input
              required
              min="1"
              type="number"
              name="quantity"
              aria-label="Cantidad recibida"
              placeholder="Cantidad recibida"
              className={inputClass}
            />
            <button disabled={busy || !receptionReady} className={primaryButtonClass}>
              Registrar recepción
            </button>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
             Genera una entrada de recepción, actualiza saldo y deja movimiento en Kardex dentro de la
            misma transacción.
          </p>
        </form>
      </div>

      {canReceive ? (
        <PurchaseReceptionForm />
      ) : null}

      {message ? (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
            messageTone === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-rose-100 bg-rose-50 text-rose-700"
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}

type ReceivingLine = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityPending: number;
};

type ReceivingOption = {
  id: string;
  code: string;
  currency: string;
  supplierName: string;
  locationName: string;
  items: ReceivingLine[];
};

function PurchaseReceptionForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ReceivingOption[]>([]);
  const [purchaseId, setPurchaseId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetch("/api/admin/compras/recepciones/opciones?query=" + encodeURIComponent(query.trim()), {
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as { options?: ReceivingOption[]; error?: unknown };
          if (!response.ok)
            throw new Error(typeof payload.error === "string" ? payload.error : "No se pudieron cargar las OC.");
          setOptions(payload.options ?? []);
          setPurchaseId((current) => (payload.options?.some((option) => option.id === current) ? current : ""));
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setOptions([]);
          setPurchaseId("");
          setMessage(error instanceof Error ? error.message : "No se pudieron cargar las OC.");
        })
        .finally(() => setLoading(false));
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const selected = options.find((option) => option.id === purchaseId);
  const lines = selected?.items ?? [];
  const items = lines
    .map((line) => ({ productId: line.productId, quantity: Number(quantities[line.id] ?? 0) }))
    .filter((line) => Number.isInteger(line.quantity) && line.quantity > 0);
  const ready = Boolean(selected && items.length);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setMessage("");
    try {
      await post("/api/admin/compras/recepciones", { purchaseId, items }, idempotencyKey);
      setMessage("Recepción registrada. Stock y Kardex fueron actualizados dentro de la misma transacción.");
      setQuantities({});
      setPurchaseId("");
      setIdempotencyKey(crypto.randomUUID());
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la recepción.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="purchase-receipt-tools" onSubmit={(event) => void submit(event)} className="rounded-xl border border-slate-200/90 bg-white p-4">
      <StepHeading number="4" eyebrow="Recepción" title="Ingresa lo recibido al inventario" icon={PackageCheck} />
      <p className="mt-3 max-w-2xl text-xs text-slate-500">
        Elige una OC pendiente y confirma sus líneas. Solo las cantidades capturadas se registran como entrada.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
        <input
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Buscar OC, proveedor o SKU"
          aria-label="Buscar orden pendiente de recepción"
          className={inputClass}
        />
        <AdminSelect
          ariaLabel="Orden pendiente de recepción"
          value={purchaseId}
          onValueChange={(value) => {
            setPurchaseId(value);
            setQuantities({});
            setMessage("");
          }}
          options={[
            { value: "", label: loading ? "Cargando órdenes…" : "Selecciona una orden pendiente" },
            ...options.map((option) => ({
              value: option.id,
              label: option.code + " · " + option.supplierName + " · " + option.locationName,
            })),
          ]}
        />
      </div>
      {selected ? (
        <div className="mt-3 grid gap-2">
          <p className="text-[11px] font-extrabold text-slate-600">
            Líneas pendientes · {selected.currency}
          </p>
          {lines.map((line) => (
            <label key={line.id} className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_130px] sm:items-center">
              <span className="min-w-0">
                <strong className="block truncate text-sm font-bold text-slate-700">{line.sku} · {line.productName}</strong>
                <span className="mt-1 block text-[11px] text-slate-500">
                  Pendiente: {line.quantityPending} de {line.quantityOrdered} · recibida: {line.quantityReceived}
                </span>
              </span>
              <input
                type="number"
                min="0"
                max={line.quantityPending}
                step="1"
                value={quantities[line.id] ?? ""}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setQuantities((current) => ({ ...current, [line.id]: value }));
                }}
                aria-label={"Cantidad recibida de " + line.sku}
                placeholder="0"
                className={inputClass}
              />
            </label>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <DependencyNote>{options.length ? "Selecciona una OC para ver sus líneas pendientes." : "No hay órdenes pendientes de recepción para esta búsqueda."}</DependencyNote>
        </div>
      )}
      {message ? <p role="status" className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">{message}</p> : null}
      <div className="mt-3 flex justify-end">
        <button disabled={busy || !ready} className={primaryButtonClass}>
          {busy ? "Registrando…" : "Registrar recepción"}
        </button>
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
         La recepción registra las entradas, actualiza el saldo y deja Kardex en la misma transacción.
      </p>
    </form>
  );
}
