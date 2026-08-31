import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { getInventoryAdminSnapshot } from "@/lib/inventory-admin";
import { getCatalogStats } from "@/lib/catalog-repository";
import { InventoryOperations } from "@/components/admin/InventoryOperations";
import { InventoryActions } from "@/components/admin/InventoryActions";
import { TransferStatusControl } from "@/components/admin/TransferStatusControl";
import { InventoryWorkspace } from "@/components/admin/AdminCategoryViews";

export const metadata: Metadata = {
  title: "Inventario | Panel admin ColdPower",
  description: "Inventario persistente, kardex y operaciones protegidas.",
};

export default async function AdminInventarioPage() {
  await requirePermission("inventory.view");
  const [snapshot, stats] = await Promise.all([getInventoryAdminSnapshot(), getCatalogStats()]);
  const metrics = [
    {
      label: "Referencias catalogadas",
      value: stats.totalProducts,
      note: "Catalogo activo",
      tone: "blue" as const,
    },
    {
      label: "Locales",
      value: snapshot.locations.length,
      note: "Ubicaciones",
      tone: "orange" as const,
    },
    {
      label: "Saldos",
      value: snapshot.balances.length,
      note: "Balances registrados",
      tone: "green" as const,
    },
    {
      label: "Movimientos",
      value: snapshot.movements.length,
      note: "Kardex persistente",
      tone: "purple" as const,
    },
    {
      label: "Reservas",
      value: snapshot.reservations.length,
      note: "Stock comprometido",
      tone: "red" as const,
    },
  ];
  const rows = snapshot.balances.map((balance) => ({
    id: balance.id,
    sku: balance.sku,
    product: balance.productName,
    current: balance.onHand,
    reserved: balance.reserved,
    available: balance.onHand - balance.reserved,
    minimum: balance.minimumStock ?? 0,
    location: balance.locationName,
    status: balance.onHand - balance.reserved <= (balance.minimumStock ?? 0) ? "Critico" : "Optimo",
  }));
  const alerts = rows.filter((row) => row.available <= row.minimum);
  const controls = (
    <div className="space-y-4">
      <InventoryOperations
        locations={snapshot.locations.map((location) => ({
          id: location.id,
          code: location.code,
          name: location.name,
          type: location.type,
        }))}
        products={snapshot.products}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {snapshot.transfers.slice(0, 8).map((transfer) => (
          <div
            key={transfer.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#e3ebf2] p-3 text-[10px]"
          >
            <span>
              {transfer.sourceLocationId} → {transfer.destinationLocationId}
            </span>
            <TransferStatusControl transferId={transfer.id} status={transfer.status} />
          </div>
        ))}
        {snapshot.reservations.slice(0, 8).map((reservation) => (
          <div
            key={reservation.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#e3ebf2] p-3 text-[10px]"
          >
            <span>
              {reservation.productId} · {reservation.quantity} unidades
            </span>
            {reservation.status === "ACTIVE" ? (
              <InventoryActions reservationId={reservation.id} />
            ) : (
              <span>{reservation.status}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
  return <InventoryWorkspace metrics={metrics} rows={rows} movements={snapshot.movements.map((movement) => ({ ...movement, createdAt: movement.createdAt.toISOString() }))} alerts={alerts} controls={controls} />;
}
