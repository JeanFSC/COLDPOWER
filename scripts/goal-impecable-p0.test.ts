import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  assertStaffInvitationRoleAllowed,
  findStaffInvitationById,
} from "../src/lib/user-administration";
import {
  applyPromotionToUnitPrice,
  isPromotionApprovalAllowedForCheckout,
  promotionApprovalChanges,
} from "../src/lib/promotion-service";
import { calculateCheckoutTotals } from "../src/lib/sales-service";
import {
  isPurchaseReceivableStatus,
  } from "../src/lib/purchases-service";
import { validatePurchaseRequestConversionItems } from "../src/lib/purchases-validation";
import { isAdminOperableReservation } from "../src/lib/inventory-domain";

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), "utf8");

test("P0 usuarios: reenviar/cancelar resuelven el id exacto y respetan el rol de publicMetadata", async () => {
  const invitation = {
    id: "inv-target",
    emailAddress: "staff@example.com",
    status: "pending",
    publicMetadata: { role: "SUPERADMIN" },
  };
  const calls: Array<{ query?: string; status?: "pending"; limit: number; offset: number }> = [];
  const list = async (params: { query?: string; status?: "pending"; limit: number; offset: number }) => {
    calls.push(params);
    if (params.query) return { data: [], totalCount: 0 };
    return { data: [invitation], totalCount: 1 };
  };

  const found = await findStaffInvitationById("inv-target", list);
  assert.equal(found?.id, invitation.id);
  assert.ok(calls.some((params) => !params.query && params.status === "pending"));
  assert.throws(
    () => assertStaffInvitationRoleAllowed("GERENCIA", invitation),
    /rol|permiso/i,
  );
  assert.doesNotThrow(() => assertStaffInvitationRoleAllowed("SUPERADMIN", invitation));

  const route = read("src/app/api/admin/usuarios/invitaciones/[id]/route.ts");
  assert.match(route, /cancelStaffInvitation\(id,\s*actor\.role\)/);
  assert.match(route, /resendStaffInvitation\(id,\s*actor\.role\)/);
});

test("P0 promociones: checkout solo acepta promociones aprobadas y SPECIAL_PRICE no sube el precio", () => {
  assert.equal(isPromotionApprovalAllowedForCheckout("APPROVED"), true);
  assert.equal(isPromotionApprovalAllowedForCheckout("NOT_REQUIRED"), true);
  assert.equal(isPromotionApprovalAllowedForCheckout("REJECTED"), false);
  assert.equal(promotionApprovalChanges("REJECTED", "actor").status, "INACTIVE");
  assert.equal(promotionApprovalChanges("APPROVED", "actor").status, undefined);
  assert.deepEqual(
    applyPromotionToUnitPrice(
      { id: "promo-special", type: "SPECIAL_PRICE", discountValue: "125.00" },
      "100.00",
    ),
    { baseUnitPrice: "100.00", discountAmount: "0.00", finalUnitPrice: "100.00" },
  );

  const service = read("src/lib/promotion-service.ts");
  assert.match(service, /inArray\(promotions\.approvalStatus,\s*checkoutPromotionApprovalStatuses\)/);
  const approvalRoute = read("src/app/api/admin/promociones/[id]/approval/route.ts");
  assert.match(approvalRoute, /promotionApprovalChanges/);
});

test("P0 promociones/ventas: el total persistido es exactamente la suma de las líneas", () => {
  const lines = [
    { baseLineTotal: "100.00", lineTotal: "85.00" },
    { baseLineTotal: "30.00", lineTotal: "25.50" },
  ];
  const totals = calculateCheckoutTotals(lines);
  const lineSum = lines.reduce((sum, line) => sum + Number(line.lineTotal), 0).toFixed(2);
  assert.equal(totals.total, lineSum);
  assert.deepEqual(totals, { subtotal: "130.00", discountAmount: "19.50", total: "110.50" });
});

test("P0 compras: solo PENDING/PARTIAL_RECEIVED aceptan recepción y cada línea conserva su costo", () => {
  assert.equal(isPurchaseReceivableStatus("PENDING"), true);
  assert.equal(isPurchaseReceivableStatus("PARTIAL_RECEIVED"), true);
  assert.equal(isPurchaseReceivableStatus("DRAFT"), false);
  assert.equal(isPurchaseReceivableStatus("RECEIVED"), false);
  assert.equal(isPurchaseReceivableStatus("CANCELLED"), false);

  assert.deepEqual(
    validatePurchaseRequestConversionItems(
      [
        { productId: "product-a", quantityRequested: 2 },
        { productId: "product-b", quantityRequested: 3 },
      ],
      { "product-a": "10.00", "product-b": "27.50" },
    ),
    [
      { productId: "product-a", quantity: 2, unitCost: "10.00" },
      { productId: "product-b", quantity: 3, unitCost: "27.50" },
    ],
  );
  assert.throws(
    () =>
      validatePurchaseRequestConversionItems(
        [{ productId: "product-a", quantityRequested: 2 }],
        { "product-a": "10.005" },
      ),
    /costo/i,
  );
  const service = read("src/lib/purchases-service.ts");
  assert.match(service, /isPurchaseReceivableStatus\(purchase\.status\)/);
  const component = read("src/components/admin/PurchaseRequestActions.tsx");
  assert.match(component, /validatePurchaseRequestConversionItems/);
  assert.match(component, /unitCosts/);
});

test("Q1/Q2 cotizaciones: cada acción del drawer apunta a una route.ts existente con su método", () => {
  const workspace = read("src/components/admin/QuotesWorkspace.tsx");
  const actions = [
    ["/send", "POST", "src/app/api/admin/cotizaciones/send/route.ts"],
    ["/response", "POST", "src/app/api/admin/cotizaciones/response/route.ts"],
    ["/follow-up", "POST", "src/app/api/admin/cotizaciones/follow-up/route.ts"],
    ["/version", "POST", "src/app/api/admin/cotizaciones/version/route.ts"],
  ] as const;
  for (const [path, method, routePath] of actions) {
    assert.match(workspace, new RegExp(`performAction\\(\\"${path}\\",\\s*\\"${method}\\"`));
    assert.ok(existsSync(join(root, routePath)), `falta ${routePath}`);
    assert.match(read(routePath), new RegExp(`export async function ${method}\\s*\\(`));
  }
  assert.match(workspace, /performAction\(\s*\"\"\s*,\s*\"PATCH\"/);
  assert.match(workspace, /workflowStatus:\s*\"CANCELLED\"/);
  assert.ok(existsSync(join(root, "src/app/api/admin/cotizaciones/route.ts")));
  assert.match(read("src/app/api/admin/cotizaciones/route.ts"), /export async function (GET|POST)\s*\(/);
  assert.match(read("src/app/api/admin/cotizaciones/route.ts"), /export async function POST\s*\(/);
  assert.ok(existsSync(join(root, "src/app/api/admin/cotizaciones/[id]/route.ts")));
  assert.match(read("src/app/api/admin/cotizaciones/[id]/route.ts"), /export async function GET\s*\(/);
  assert.match(read("src/app/api/admin/cotizaciones/[id]/route.ts"), /export async function PATCH\s*\(/);
  assert.match(workspace, /fetch\(\"\/api\/admin\/cotizaciones\"/);
  assert.match(workspace, /fetch\(`\/api\/admin\/cotizaciones\/\$\{encodeURIComponent\(id\)\}`/);
  assert.match(workspace, /quoteId:\s*detailId/);
});

test("Inventario #2: las reservas de pedidos no son operables desde Inventario", () => {
  assert.equal(isAdminOperableReservation("order"), false);
  assert.equal(isAdminOperableReservation("ORDER"), false);
  assert.equal(isAdminOperableReservation("quote"), true);
  assert.equal(isAdminOperableReservation("manual"), true);

  const inventory = read("src/lib/inventory.ts");
  assert.match(inventory, /isAdminOperableReservation\(reservation\.referenceType\)/);
  const workspace = read("src/components/admin/InventoryAdminWorkspace.tsx");
  assert.match(workspace, /isAdminOperableReservation\(reservation\.referenceType\)/);
});

test("Inventario y compras: la recepciÃ³n, expiraciÃ³n y traslado conservan sus contratos de seguridad", () => {
  const roles = read("src/lib/roles.ts");
  const transferRoute = read("src/app/api/admin/inventario/transferencias/route.ts");
  const cronRoute = read("src/app/api/internal/cron/pedidos-expirados/route.ts");
  const receptionRoute = read("src/app/api/admin/compras/recepciones/route.ts");
  assert.match(roles, /ALMACEN:[^\n]*purchases\.receive/);
  assert.match(transferRoute, /resolvedTransferId = existing\.id/);
  assert.match(transferRoute, /status: idempotent \? 200 : 201/);
  assert.match(transferRoute, /requestedBy: actor\.userId/);
  assert.match(cronRoute, /expireInventoryReservations/);
  assert.match(cronRoute, /cronSecret/);
  assert.match(receptionRoute, /Idempotency-Key/);
});
