import { timingSafeEqual } from "node:crypto";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { commerceConfig } from "@/lib/env";
import { expireInventoryReservations } from "@/lib/inventory";
import { cancelExpiredUnpaidOrders } from "@/lib/sales-service";

export const dynamic = "force-dynamic";

function authorized(header: string | null) {
  const secret = commerceConfig.cronSecret;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(header.slice("Bearer ".length));
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Scheduled sweep (e.g. every 5 min): cancels unpaid online orders past their payment
// deadline and releases their stock. Also runs opportunistically after each checkout.
export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"))) return apiError("UNAUTHORIZED", "No autorizado.", 401);
  const [orders, inventoryReservations] = await Promise.all([
    cancelExpiredUnpaidOrders(),
    // The inventory sweep explicitly excludes order reservations; order stock
    // remains owned by the commerce expiry transaction above.
    expireInventoryReservations(),
  ]);
  return apiSuccess({ success: true, orders, inventoryReservations });
}
