import assert from "node:assert/strict";
import test from "node:test";
import { getSalesPage, getSaleDetail } from "@/lib/sales-repository";
import { getOrdersPage, getOrderDetail } from "@/lib/orders-repository";
test("CP-037 runtime ventas paginadas y métricas",async()=>{const page=await getSalesPage({page:1,pageSize:10});assert.equal(page.pageSize,10);assert.equal(page.metrics.total,page.totalItems);assert.ok(page.items.length<=10);if(page.items[0]){const detail=await getSaleDetail(page.items[0].id);assert.ok(detail);assert.equal(detail.sale.id,page.items[0].id)}});
test("CP-038 runtime pedidos paginados y métricas",async()=>{const page=await getOrdersPage({page:1,pageSize:10});assert.equal(page.pageSize,10);assert.equal(page.metrics.total,page.totalItems);assert.ok(page.items.length<=10);if(page.items[0]){const detail=await getOrderDetail(page.items[0].id);assert.ok(detail);assert.equal(detail.order.id,page.items[0].id)}});
