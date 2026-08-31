"use client";

import { useState, type FormEvent, type ReactNode } from "react";
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
  const result = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
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

function DependencyNote({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warning" }) {
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
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === "ACTIVE");
  const pendingPurchases = purchases.filter(
    (purchase) => purchase.status === "PENDING" || purchase.status === "PARTIAL_RECEIVED",
  );
  const orderDependenciesReady = suppliers.length > 0 && locations.length > 0 && products.length > 0;

  async function submit(
    event: FormEvent<HTMLFormElement>,
    path: string,
    transform: (data: Record<string, FormDataEntryValue>) => unknown,
  ) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await post(path, transform(data));
      setMessage("Guardado. Recarga para ver los datos persistidos.");
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
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
              Completa los pasos en orden. Crear una orden no altera el inventario; solo una recepción validada registra el movimiento.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold text-[#526b84]">
            <span aria-label="1. Proveedor" className="inline-flex items-center gap-1.5"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#2277ee] text-white">1</span> Proveedor</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#9db0c1]" aria-hidden="true" />
            <span aria-label="2. Orden de compra" className="inline-flex items-center gap-1.5"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#dce8f4] text-[#526b84]">2</span> Orden</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#9db0c1]" aria-hidden="true" />
            <span aria-label="3. Recepción" className="inline-flex items-center gap-1.5"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#dce8f4] text-[#526b84]">3</span> Recepción</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={(event) =>
            void submit(event, "/api/admin/proveedores", (data) => ({
              name: data.name,
              identification: data.identification,
              country: data.country,
              contactName: data.contactName,
              whatsapp: data.whatsapp,
              email: data.email,
              address: data.address,
              currency: data.currency,
              notes: data.notes,
            }))
          }
          className="rounded-xl border border-[#e2eaf1] bg-white p-5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]"
        >
          <StepHeading number="1" eyebrow="Proveedor" title="Registra el origen de compra" icon={Truck} />
          <p className="mt-3 text-[10px] font-semibold leading-5 text-[#71869c]">
            Primero registra un proveedor activo; después podrás crear una orden.
          </p>
          <div className="mt-4 space-y-2">
            <input required name="name" placeholder="Nombre comercial" className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm" />
            <input name="identification" placeholder="RUC / identificación" className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input required name="country" defaultValue="PE" maxLength={2} placeholder="País ISO" className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm uppercase" />
              <input required name="currency" defaultValue="PEN" maxLength={3} placeholder="Moneda" className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm uppercase" />
            </div>
            <input name="contactName" placeholder="Contacto" className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm" />
            <input name="whatsapp" placeholder="WhatsApp" className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm" />
            <input type="email" name="email" placeholder="Correo" className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm" />
            <input name="address" placeholder="Dirección" className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm" />
          </div>
          <button disabled={busy} className="mt-3 rounded-full bg-[#102a43] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            Guardar proveedor
          </button>
        </form>

        <form
          onSubmit={(event) =>
            void submit(event, "/api/admin/compras", (data) => ({
              supplierId: data.supplierId,
              locationId: data.locationId,
              currency: data.currency,
              items: [{ productId: data.productId, quantity: Number(data.quantity), unitCost: data.unitCost }],
            }))
          }
          className="rounded-xl border border-[#e2eaf1] bg-white p-5 shadow-[0_1px_3px_rgba(16,42,67,0.035)]"
        >
          <StepHeading number="2" eyebrow="Orden de compra" title="Solicita el abastecimiento" icon={ClipboardList} />
          <p className="mt-3 text-[10px] font-semibold leading-5 text-[#71869c]">
            Selecciona proveedor, local y producto para dejar la orden pendiente de recepción.
          </p>
          {!orderDependenciesReady ? (
            <div className="mt-3">
              <DependencyNote tone="warning">
                <strong>Antes de crear una orden:</strong> registra al menos un proveedor, un local activo y un producto disponible.
              </DependencyNote>
            </div>
          ) : null}
          <div className="mt-4 space-y-2">
            <select required name="supplierId" defaultValue="" className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm">
              <option value="">Proveedor</option>
              {activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} · {supplier.currency}</option>)}
            </select>
            <select required name="locationId" defaultValue="" className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm">
              <option value="">Local de recepción</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
            <select required name="productId" defaultValue="" className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm">
              <option value="">Producto</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input required min="1" type="number" name="quantity" placeholder="Cantidad" className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm" />
              <input required min="0.01" step="0.01" name="unitCost" placeholder="Costo unitario" className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm" />
            </div>
            <input required maxLength={3} name="currency" defaultValue="PEN" placeholder="Moneda" className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm uppercase" />
          </div>
          <button disabled={busy || !suppliers.length || !locations.length || !products.length} className="mt-3 rounded-full bg-[#102a43] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            Crear orden
          </button>
          <p className="mt-2 text-[10px] font-semibold leading-5 text-[#71869c]">La orden queda pendiente; la recepción es la que afecta inventario.</p>
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
          <StepHeading number="3" eyebrow="Recepción" title="Ingresa lo recibido al inventario" icon={PackageCheck} />
          <p className="mt-3 max-w-2xl text-[10px] font-semibold leading-5 text-[#71869c]">
            Confirma cantidades recibidas para generar el movimiento transaccional correspondiente.
          </p>
          {!pendingPurchases.length ? (
            <div className="mt-3">
              <DependencyNote>
                <strong>No hay órdenes pendientes de recepción.</strong> Cuando una orden esté pendiente o parcialmente recibida, aparecerá en esta lista.
              </DependencyNote>
            </div>
          ) : null}
          <div className="mt-4 grid gap-2 md:grid-cols-[1.2fr_1.2fr_0.7fr_auto] md:items-end">
            <select required name="purchaseId" defaultValue="" className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm">
              <option value="">Orden pendiente</option>
              {pendingPurchases.map((purchase) => <option key={purchase.id} value={purchase.id}>{purchase.code} · {purchase.currency} {purchase.subtotal}</option>)}
            </select>
            <select required name="productId" defaultValue="" className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm">
              <option value="">Producto recibido</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
            </select>
            <input required min="1" type="number" name="quantity" placeholder="Cantidad recibida" className="h-10 w-full rounded-lg border border-[#dce6ee] px-3 text-sm" />
            <button disabled={busy || !purchases.length} className="h-10 rounded-full bg-[#2277ee] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              Registrar recepción
            </button>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[10px] font-semibold leading-5 text-[#71869c]">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#159263]" aria-hidden="true" />
            Genera `PURCHASE_RECEIPT`, actualiza saldo y deja movimiento en Kardex dentro de la misma transacción.
          </p>
        </form>
      </div>

      {message ? <p className="text-sm font-bold text-[#526b84]" role="status">{message}</p> : null}
    </section>
  );
}
