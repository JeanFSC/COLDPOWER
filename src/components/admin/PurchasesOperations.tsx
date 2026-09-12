"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, PackageCheck, Truck } from "lucide-react";

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

async function post(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { error?: string | { message?: string } };
  if (!response.ok) {
    const error = typeof result.error === "string" ? result.error : result.error?.message;
    throw new Error(error || "No se pudo guardar.");
  }
  return result;
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
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f1ff] text-[12px] font-black text-[#2277ee]">
        {number}
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2277ee]">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-[21px] font-black tracking-[-0.02em] text-[#102a43]">
          {title}
        </h2>
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
      className={`rounded-lg border px-3 py-2.5 text-[10px] font-semibold leading-5 ${
        tone === "warning"
          ? "border-[#f5d8b1] bg-[#fff8ed] text-[#8a5b20]"
          : "border-[#dfe8ef] bg-[#f8fafc] text-[#71869c]"
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
}: {
  suppliers: Supplier[];
  locations: Location[];
  products: Product[];
  purchases: Purchase[];
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<Product[]>(products);
  const [requestProductQuery, setRequestProductQuery] = useState("");
  const [requestProductOptions, setRequestProductOptions] = useState<Product[]>(products);
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
      setMessage("Guardado. Recarga para ver los datos persistidos.");
      event.currentTarget.reset();
      setProductQuery("");
      setRequestProductQuery("");
    } catch (error) {
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
      setMessage("Proveedor guardado. Recarga para ver los datos persistidos.");
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el proveedor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 space-y-4" aria-label="Flujo de compras">
      <div className="rounded-xl border border-[#dce6ee] bg-[#f8fafc] p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#2277ee]">
              Flujo de compras
            </p>
            <h2 className="mt-1.5 font-display text-[22px] font-black tracking-[-0.025em] text-[#102a43]">
              Del proveedor a la recepción
            </h2>
            <p className="mt-1.5 max-w-2xl text-[11px] font-semibold leading-5 text-[#71869c]">
              Completa los pasos en orden. Crear una orden no altera el inventario; solo una
              recepción validada registra el movimiento.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold text-[#526b84]">
            <span aria-label="1. Solicitud" className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#2277ee] text-white">
                1
              </span>{" "}
              Solicitud
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-[#9db0c1]" aria-hidden="true" />
            <span aria-label="2. Proveedor" className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#dce8f4] text-[#526b84]">
                2
              </span>{" "}
              Proveedor
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-[#9db0c1]" aria-hidden="true" />
            <span aria-label="3. Orden de compra" className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#dce8f4] text-[#526b84]">
                3
              </span>{" "}
              Orden
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-[#9db0c1]" aria-hidden="true" />
            <span aria-label="4. Recepción" className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#dce8f4] text-[#526b84]">
                4
              </span>{" "}
              Recepción
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={(event) =>
            void submit(event, "/api/admin/compras/solicitudes", (data) => ({
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
            }))
          }
          className="rounded-xl border border-[#e2eaf1] bg-white p-5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]"
        >
          <StepHeading
            number="1"
            eyebrow="Solicitud"
            title="Define lo que hay que comprar"
            icon={ClipboardList}
          />
          <p className="mt-3 text-[10px] font-semibold leading-5 text-[#71869c]">
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
            <select
              required
              name="locationId"
              aria-label="Local de recepción de la solicitud"
              defaultValue=""
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            >
              <option value="">Local de recepción</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <select
              name="source"
              aria-label="Origen de la solicitud"
              defaultValue="MANUAL"
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            >
              <option value="MANUAL">Origen manual</option>
              <option value="STOCK_ALERT">Alerta de stock</option>
              <option value="REPLENISHMENT">Reposición</option>
              <option value="OTHER">Otro</option>
            </select>
            <input
              value={requestProductQuery}
              onChange={(event) => setRequestProductQuery(event.currentTarget.value)}
              placeholder="Buscar producto por SKU o nombre (mín. 2 caracteres)"
              aria-label="Buscar producto para la solicitud"
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            />
            <select
              required
              name="productId"
              aria-label="Producto solicitado"
              defaultValue=""
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            >
              <option value="">Producto solicitado</option>
              {displayedRequestProductOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} · {product.name}
                </option>
              ))}
            </select>
            <input
              required
              min="1"
              type="number"
              name="quantity"
              aria-label="Cantidad solicitada"
              placeholder="Cantidad solicitada"
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            />
            <input
              name="itemNotes"
              aria-label="Nota de la línea de solicitud"
              placeholder="Nota de la línea (opcional)"
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            />
            <textarea
              name="notes"
              aria-label="Nota general de la solicitud"
              placeholder="Nota general (opcional)"
              rows={2}
              className="w-full rounded-lg border border-[#dce6ee] px-3 py-2 text-sm"
            />
          </div>
          <button
            disabled={busy || !requestDependenciesReady}
            className="mt-3 rounded-full bg-[#102a43] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Guardar solicitud
          </button>
        </form>

        <form
          onSubmit={(event) => void submitSupplier(event)}
          className="rounded-xl border border-[#e2eaf1] bg-white p-5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]"
        >
          <StepHeading
            number="2"
            eyebrow="Proveedor"
            title="Registra el origen de compra"
            icon={Truck}
          />
          <p className="mt-3 text-[10px] font-semibold leading-5 text-[#71869c]">
            Primero registra un proveedor activo; después podrás crear una orden.
          </p>
          <div className="mt-4 space-y-2">
            <input
              required
              name="name"
              aria-label="Nombre comercial del proveedor"
              placeholder="Nombre comercial"
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            />
            <input
              name="identification"
              aria-label="RUC o identificación del proveedor"
              placeholder="RUC / identificación"
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                name="country"
                aria-label="País del proveedor"
                defaultValue="PE"
                maxLength={2}
                placeholder="País ISO"
                className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm uppercase"
              />
              <input
                required
                name="currency"
                aria-label="Moneda del proveedor"
                defaultValue="PEN"
                maxLength={3}
                placeholder="Moneda"
                className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm uppercase"
              />
            </div>
            <input
              name="contactName"
              aria-label="Contacto del proveedor"
              placeholder="Contacto"
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            />
            <input
              name="whatsapp"
              aria-label="WhatsApp del proveedor"
              placeholder="WhatsApp"
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            />
            <input
              type="email"
              name="email"
              aria-label="Correo del proveedor"
              placeholder="Correo"
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            />
            <input
              name="address"
              aria-label="Dirección del proveedor"
              placeholder="Dirección"
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            />
          </div>
          <button
            disabled={busy}
            className="mt-3 rounded-full bg-[#102a43] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Guardar proveedor
          </button>
        </form>

        <form
          onSubmit={(event) =>
            void submit(event, "/api/admin/compras", (data) => ({
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
            }))
          }
          className="rounded-xl border border-[#e2eaf1] bg-white p-5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]"
        >
          <StepHeading
            number="3"
            eyebrow="Orden de compra"
            title="Solicita el abastecimiento"
            icon={ClipboardList}
          />
          <p className="mt-3 text-[10px] font-semibold leading-5 text-[#71869c]">
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
            <select
              required
              name="supplierId"
              aria-label="Proveedor de la orden de compra"
              defaultValue=""
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            >
              <option value="">Proveedor</option>
              {activeSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} · {supplier.currency}
                </option>
              ))}
            </select>
            <select
              required
              name="locationId"
              aria-label="Local de recepción de la orden"
              defaultValue=""
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            >
              <option value="">Local de recepción</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <input
              value={productQuery}
              onChange={(event) => setProductQuery(event.currentTarget.value)}
              placeholder="Buscar producto por SKU o nombre (mín. 2 caracteres)"
              aria-label="Buscar producto para la orden"
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            />
            <select
              required
              name="productId"
              aria-label="Producto de la orden de compra"
              defaultValue=""
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            >
              <option value="">Producto</option>
              {displayedProductOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} · {product.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                min="1"
                type="number"
                name="quantity"
                aria-label="Cantidad de la orden"
                placeholder="Cantidad"
                className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm"
              />
              <input
                required
                min="0.01"
                step="0.01"
                name="unitCost"
                aria-label="Costo unitario de la orden"
                placeholder="Costo unitario"
                className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm"
              />
            </div>
            <input
              required
              maxLength={3}
              name="currency"
              aria-label="Moneda de la orden"
              defaultValue="PEN"
              placeholder="Moneda"
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm uppercase"
            />
            <label className="block text-[10px] font-bold text-[#71869c]">
              Entrega esperada (opcional)
              <input
                type="datetime-local"
                name="expectedDeliveryAt"
                aria-label="Fecha y hora de entrega esperada"
                className="mt-1 h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm font-normal text-[#304b66]"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              name="createAs"
              value="DRAFT"
              disabled={
                busy || !suppliers.length || !locations.length || !displayedProductOptions.length
              }
              className="rounded-full border border-[#dce6ee] px-4 py-2 text-sm font-bold text-[#304b66] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Guardar borrador
            </button>
            <button
              name="createAs"
              value="PENDING"
              disabled={
                busy || !suppliers.length || !locations.length || !displayedProductOptions.length
              }
              className="rounded-full bg-[#102a43] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Emitir OC
            </button>
          </div>
          <p className="mt-2 text-[10px] font-semibold leading-5 text-[#71869c]">
            Un borrador se puede emitir después; solo la recepción validada afecta inventario.
          </p>
        </form>

        <form
          onSubmit={(event) =>
            void submit(event, "/api/admin/compras/recepciones", (data) => ({
              purchaseId: data.purchaseId,
              items: [{ productId: data.productId, quantity: Number(data.quantity) }],
            }))
          }
          className="rounded-xl border border-[#e2eaf1] bg-white p-5 shadow-[0_1px_3px_rgba(16,42,67,0.035)] lg:col-span-2"
        >
          <StepHeading
            number="4"
            eyebrow="Recepción"
            title="Ingresa lo recibido al inventario"
            icon={PackageCheck}
          />
          <p className="mt-3 max-w-2xl text-[10px] font-semibold leading-5 text-[#71869c]">
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
            <select
              required
              name="purchaseId"
              aria-label="Orden pendiente de recepción"
              defaultValue=""
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            >
              <option value="">Orden pendiente</option>
              {pendingPurchases.map((purchase) => (
                <option key={purchase.id} value={purchase.id}>
                  {purchase.code} · {purchase.currency} {purchase.subtotal}
                </option>
              ))}
            </select>
            <input
              value={productQuery}
              onChange={(event) => setProductQuery(event.currentTarget.value)}
              placeholder="Buscar producto por SKU o nombre"
              aria-label="Buscar producto recibido"
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            />
            <select
              required
              name="productId"
              aria-label="Producto recibido"
              defaultValue=""
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            >
              <option value="">Producto recibido</option>
              {displayedProductOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} · {product.name}
                </option>
              ))}
            </select>
            <input
              required
              min="1"
              type="number"
              name="quantity"
              aria-label="Cantidad recibida"
              placeholder="Cantidad recibida"
              className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm"
            />
            <button
              disabled={busy || !purchases.length || !displayedProductOptions.length}
              className="h-10 rounded-full bg-[#2277ee] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Registrar recepción
            </button>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[10px] font-semibold leading-5 text-[#71869c]">
            <CheckCircle2
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#159263]"
              aria-hidden="true"
            />
            Genera `PURCHASE_RECEIPT`, actualiza saldo y deja movimiento en Kardex dentro de la
            misma transacción.
          </p>
        </form>
      </div>

      {message ? (
        <p className="text-sm font-bold text-[#526b84]" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
