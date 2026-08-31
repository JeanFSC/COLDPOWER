import assert from "node:assert/strict";
import test from "node:test";
import { getPurchaseDetail, getPurchasesPage } from "@/lib/purchases-repository";
test("CP-039 runtime compras paginadas y métricas",async()=>{const page=await getPurchasesPage({page:1,pageSize:10});assert.equal(page.pageSize,10);assert.equal(page.metrics.total,page.totalItems);assert.ok(page.items.length<=10);if(page.items[0]){const detail=await getPurchaseDetail(page.items[0].id);assert.ok(detail);assert.equal(detail.purchase.id,page.items[0].id)}});
