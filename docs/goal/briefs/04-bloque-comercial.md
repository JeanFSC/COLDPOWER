# Brief 04 — Bloque comercial: Cotizaciones → Ventas → Pedidos → Pagos (Codex)

Lee completo `docs/goal/GOAL-IMPECABLE.md`, `AGENTS.md`, `docs/goal/audits/clientes-crm-cotizaciones.md` (sección Cotizaciones) y `docs/goal/audits/ventas-pedidos-pagos.md`. Rama `codex/goal-impecable`. Ya corregidos (no rehacer): O1, Q1, Q2 y los P0 de promociones/compras/invitaciones/reservas.

## Parte A — Lógica y datos (implementa directo, con tests de comportamiento en `test:all`)
Orden obligatorio:
1. **Dinero**: G1 (aprobación tardía → pago CONFIRMED con marca "requiere reembolso" + cola "Por reembolsar" + notificación con deep-link), O9 + V2 + V3 (anular venta/pedido pasa por `changeOrderStatus`, bloquea con CONFIRMED/APPROVED, cancela pagos PENDING/UNDER_REVIEW en la misma transacción).
2. **Ledger único** (G3) usado por payment-service, sales-service y payments-repository; G2 (tasa con numerador/denominador; cancelado+pagado = "Por reembolsar").
3. G4 devolución manual, G5 reembolso reintentable.
4. Cotizaciones: Q3 aprobación de descuentos (ruta + actualización de ítems), Q4 solicitud web entra como DRAFT, Q5 lead dentro de la transacción, Q11, Q10, Q12, Q14.
5. Pedidos: O2 historial, O4 ALMACEN ve y prepara pedidos (sin pagos), O3 fixture de demo coherente con la máquina de estados, O5, O6, O7, O8.
6. Ventas: V1, V4 (anular desde el drawer con `sales.cancel` + motivo), V5, V6 (hora Lima), V7, V8.
7. **Deep-links**: cada módulo acepta `?quoteId=`, `?saleId=`, `?orderId=`, `?paymentId=`, `?customerId=` y abre el drawer del registro; todos los IDs visibles enlazan al módulo dueño filtrado (Q6, Q9, V9, O10, G9). Notificaciones de estos dominios con deep-link.
8. Tests: reescribe `admin-*-ui-contract` de ventas/pedidos/pagos contra los componentes vivos; engancha cp036/cp037/cp038/cp040 a `test:all`.

## Parte B — Visual (DISEÑO PRIMERO)
Para los drawers y tablas de Cotizaciones, Ventas, Pedidos y Pagos: genera mockups (1920×1080 y 390) en `docs/goal/designs/comercial/` usando el kit admin (`src/components/admin/ui/*` si ya existe), y **detente**. Claude aprueba antes de implementar Q7, Q8, Q13, G6, G7, G8, V10, O12, G10.

## Verificación
`tsc --noEmit`, lint de tus archivos, tests afectados + `node scripts/test-all.mjs`. NO commit. Reporta hallazgos cerrados (#), pendientes y riesgos.
