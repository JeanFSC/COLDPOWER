# 17-R3b — revisión Claude

Entorno QA: `http://localhost:3003`, PostgreSQL 18 local en `127.0.0.1:5433`, sin Neon. No se modificaron `.env.local` ni `proxy.ts` y no se creó commit.

## A — Clerk siempre montado

`src/app/layout.tsx` vuelve a montar `ClerkProvider` siempre que Clerk está configurado, con los redirects originales. Se eliminó `DeferredClerkProvider` y se retiraron sus hooks/handlers de Header, MobileMenu, AdminShell y ClerkAuthPanel. `scripts/cp028-auth-flow-contract.test.mjs` vuelve a inspeccionar `layout.tsx`; el contrato pasa dentro de `test-all`.

La búsqueda de regresión no encuentra `DeferredClerkProvider`, `useClerkRuntime`, `requestLoad`, `isClerkReady` ni `isReady` en el alcance revisado.

Prueba de comportamiento: `scripts/qa/r3-auth-navigation.mjs` obtuvo navegación interna exitosa a `/cuenta` y preservó todos los campos de `/cotizacion` después de interactuar con el header. El resultado es `BLOCKED_AUTH_SESSION` solo para la parte de sesión: el bypass `CP_DEV_AUTH_*` autoriza el servidor, pero un contexto Playwright headless sin `QA_STORAGE_STATE` no contiene una cookie Clerk y el header muestra `Ingresar`.

Capturas: `r3-auth-navigation/01-home-auth-state.png`, `02-account-after-client-navigation.png`, `03-quote-half-filled-before-hover.png`, `04-quote-half-filled-after-hover.png`.

SQL: `r3-auth-navigation/sql-auth-fixture.tsv` confirma el fixture local `cp-dashboard-v5-user-staff-001`, rol `VENTAS`, estado `ACTIVE`, y su customer asociado.

## B — pagos tardíos

`src/lib/payment-service.ts` ahora:

- trata una reconfirmación del mismo estado como no-op idempotente, sin auditoría de reembolso ni notificación;
- diferencia `APPROVED → CONFIRMED` del reingreso de un pago ya recibido;
- calcula el ledger neto por pedido y moneda, permitiendo abonos parciales que completan el total;
- marca solo el exceso como `overpaidAmount` cuando corresponde;
- marca un cobro posterior como reembolso requerido únicamente cuando el pedido ya está cubierto o cerrado;
- inserta siempre `paymentAttempts` y `paymentStatusHistory` en la transición real, usando la razón exacta `Aprobación posterior: requiere reembolso` para la rama tardía;
- conserva refund idempotente también para pagos manuales con referencia documental.

La prueba local `scripts/brief17-r3-payments.test.ts` pasó los seis casos del brief: `6 pass`, `0 fail`.

Prueba de comportamiento y capturas UI: `01-pagos-confirmacion-tardia/result.json` valida confirmaciones tardías, duplicado idempotente y doble cobro; `B2.3-B5.1-payments/result.json` terminó `COMPLETED` con cobro manual, doble click de reembolso, cancelación del proveedor, aprobación tardía y cola de reembolso. Las capturas están en esas dos carpetas.

SQL: `B2.3-B5.1-payments/sql-after-refund.tsv` demuestra un único refund `SUCCEEDED` de 90.00; `sql-after-late-approval.tsv` demuestra pedido cancelado y pago `CONFIRMED`; `sql-after-refund-queue.tsv` demuestra el reembolso de la aprobación tardía con una sola fila. La batería a–f usa PostgreSQL local y limpia sus fixtures al terminar.

## C — revalidación por UI

Scripts ejecutados con `QA_BASE_URL=http://localhost:3003` y Playwright headless:

- `scripts/qa/r3-1-payments.mjs`: `COMPLETED`; transiciones rechazado/error/cancelado a confirmado, duplicados y doble cobro.
- `scripts/qa/b-2-3-payments.mjs`: `COMPLETED`; todos los stages solicitados y refund idempotente.
- `scripts/qa/b-1-1-quote.mjs`: `COMPLETED`; solicitud pública, edición comercial, envío, respuesta aceptada y conversión en venta. El SKU histórico `CP-ROT-8284` no existe publicado en la base local; el script usa el producto publicado real `CP-REF-MCP-0103`, justificado en `test-contract-justifications.md`.
- `scripts/qa/r3-auth-navigation.mjs`: rutas y formulario pasan; la sesión Clerk queda bloqueada por falta de `QA_STORAGE_STATE`, documentado en A.

Capturas y SQL: cada escenario tiene su carpeta bajo `docs/goal/evidencia/17r3/`; B1.1 incluye `12-sale-created.png`, `13-prohibited-url.png`, `sql-after-sale.tsv`; los recorridos de pagos incluyen sus capturas y TSV SQL.

## Gates finales

- `corepack pnpm exec tsc --noEmit`: PASS.
- `corepack pnpm lint`: PASS, 0 errores / 0 warnings.
- `corepack pnpm exec dotenv -e .env.localdb -- node scripts/test-all.mjs`: todos los bloques pasan salvo el único XLSX externo permitido, ausente en `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`.
- `corepack pnpm exec dotenv -e .env.localdb -- corepack pnpm build`: PASS.

El servidor de QA fue apagado y el puerto 3003 quedó libre.
