# CP-033 · Rediseño de inventario · QA

final result: blocked

Fecha: 2026-08-31  
SHA inicial: `df603525bfc9ebedbef15ec7238ae28e5d00a679`  
SHA final: `df603525bfc9ebedbef15ec7238ae28e5d00a679` (cambios CP-033 sin commit; se preservó el worktree existente)  
Rama: `main`

## Checklist de entrega

1. SHA inicial: registrado arriba.
2. SHA final: registrado arriba; el entregable permanece sin commit para no mezclar cambios previos del usuario.
3. Rama: `main`.
4. Componentes modificados: `src/app/admin/inventario/page.tsx`, workspace operativo, rutas de inventario, dominio, transacciones, schema y control de transferencia.
5. Componentes nuevos: `src/components/admin/InventoryAdminWorkspace.tsx`, `src/app/admin/inventario/loading.tsx` y `src/app/admin/inventario/error.tsx`.
6. Endpoints modificados: ajustes, locales, mínimos, reservas, consumo, liberación y transferencias.
7. Endpoints nuevos: `GET /api/admin/inventario`, `GET /api/admin/inventario/kardex`, `GET /api/admin/inventario/kardex/export`, `GET /api/admin/inventario/movimientos`, `GET /api/admin/inventario/export` y `GET /api/admin/inventario/productos`.
8. DB/schema changes: enum de transferencias canónico, `inventory_movements.idempotency_key`, `inventory_reservations.reason` y `transfers.idempotency_key` único.
9. Migrations: `drizzle/0033_cp033_inventory_workflow.sql`, `drizzle/0034_cp033_inventory_idempotency.sql`, `drizzle/0035_cp033_reservation_trace.sql` y `drizzle/0036_cp033_transfer_idempotency.sql`.
10. Fórmula `available`: `onHand - reserved`.
11. `onHand`: unidades físicas persistidas en el balance del producto y local.
12. `reserved`: unidades comprometidas en reservas activas.
13. KPI Referencias: `count(distinct product_id)` sobre saldos persistidos.
14. KPI Físico: suma SQL de `on_hand`.
15. KPI Reservado: suma SQL de `reserved`.
16. KPI Disponible: suma SQL de `on_hand - reserved`.
17. KPI Crítico: mínimo no nulo, disponible mayor que cero y disponible menor o igual al mínimo.
18. NULL mínimo vs 0: NULL se muestra como “Sin mínimo”; 0 es un mínimo explícito.
19. Estados visuales: Sin saldo, Sin mínimo, Agotado, Crítico, Stock bajo y Óptimo; “Reservado” queda disponible como filtro operativo cuando existe reserva activa.
20. Lógica de ajustes: todas las entradas/salidas pasan por la operación transaccional central.
21. Tipos de movimiento: saldo inicial, compra, ajustes, devoluciones y reservas según el contrato de inventario.
22. Lógica de reservas: bloquea el balance y aumenta `reserved` con validación de disponible.
23. Expiración de reservas: endpoint de expiración y estado `EXPIRED` en el flujo existente.
24. Consumir: convierte la reserva activa en consumo de inventario dentro de transacción.
25. Liberar: reduce reservado y cambia la reserva a `RELEASED` dentro de transacción.
26. Workflow de transferencia: `DRAFT → REQUESTED → IN_TRANSIT → RECEIVED`, con cancelación controlada.
27. Discrepancia APPROVED/PREPARED: detectada en enum/schema heredado.
28. Resolución: migration guardada rechaza datos heredados y recrea el enum canónico; los aliases no se usan como estados.
29. `TRANSFER_OUT`: al pasar de `REQUESTED` a `IN_TRANSIT`.
30. `TRANSFER_IN`: al recibir una transferencia `IN_TRANSIT` mediante el endpoint dedicado.
31. Cancelación: compensa con entrada en origen solo cuando ya estaba en tránsito.
32. Kardex: consulta paginada por producto/local con filtros de tipo/fecha, entradas, salidas, reservado, stock anterior, stock posterior, disponible posterior, referencia, actor, motivo y notas.
33. Auditoría: los movimientos, mínimos, reservas y transferencias registran actor y evento.
34. Notificaciones: se conserva la notificación de transferencia pendiente de gestión.
35. Filtros: consulta server-side por texto técnico, local, categoría, familia, marca, estado, reservas, mínimo configurado, disponible mínimo y fechas de actualización.
36. Paginación: tamaños 10/25/50/100; el límite aplica al listado, no a los KPI.
37. Export: `GET /api/admin/inventario/kardex/export` genera CSV UTF-8 del Kardex completo del producto y local seleccionados; `GET /api/admin/inventario/export` genera CSV UTF-8 del listado respetando los filtros activos.
38. Import inicial: no se ejecutó ni se alteró el catálogo; requiere el XLSX canónico.
39. RBAC: endpoints y UI usan permisos canónicos con puntos.
40. Aliases permisos: los aliases con dos puntos permanecen declarados para compatibilidad.
41. Concurrency: balances y transferencias usan locks transaccionales en las operaciones existentes.
42. Idempotency: movimientos, reservas y transferencias aceptan `Idempotency-Key`, con índices únicos y control de saldo inicial duplicado.
43. N+1: KPIs y listados usan agregados SQL y media batch; el producto del combobox se busca server-side.
44. Responsive: se implementaron tabla desktop y tarjetas móviles con layout adaptable.
45. Empty states: el listado comunica ausencia de saldos sin interpretar catálogo como cero.
46. Error states: diálogos y Kardex muestran errores de API sin reportar falsos éxitos.
47. Loading: controles muestran estado ocupado y el Kardex muestra carga persistida.
48. Tests: los tests CP-033, dominio, workflow CP-030, importación segura y operaciones pasan; 16 tests ejecutados, 16 pasan.
49. TypeScript: no hay errores reportados en los archivos CP-033; el chequeo global falla fuera del alcance por el estado modificado de cotizaciones (`quote-repository.ts`) y por `BigInt` incompatible con target ES2017 en `pricing-bulk-service.ts`.
50. Lint: los archivos CP-033 pasan sin errores; el lint global conserva 28 warnings preexistentes fuera del alcance.
51. Build: el estado actual no llega a compilar producción porque `src/lib/quote-repository.ts` modificado contiene un error de parseo; es un cambio ajeno a CP-033 y se preservó.
52. Screenshots: no se generaron screenshots finales; la sesión local sí está autenticada como Superadmin, pero la pantalla cae en el estado de error controlado porque la base conectada aún no tiene la migración 0035.
53. Diferencias vs diseño: la imagen adjunta muestra “Gestión de precios”, no `/admin/inventario`; por eso no se puede declarar una comparación 1:1 honesta.
54. Blockers restantes: aplicar las migraciones 0033–0036 en la base de verificación autorizada, adjuntar la referencia visual correcta de inventario, resolver los fallos globales fuera del alcance y ejecutar la suite con `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx` antes de marcar QA como passed.

## Evidencia de ejecución

- `corepack pnpm exec tsx --test scripts/cp033-inventory-contract.test.ts scripts/inventory-domain.test.ts scripts/cp030-transfer-workflow.test.ts scripts/stock-import.test.ts scripts/cp033-inventory-ui-contract.test.mjs scripts/inventory-operations-contract.test.mjs`: PASS, 16/16.
- `corepack pnpm exec eslint` sobre los archivos CP-033: PASS, 0 errores.
- `corepack pnpm exec tsc --noEmit --incremental false`: FAIL fuera de CP-033 por el archivo modificado `src/lib/quote-repository.ts` y `BigInt` no compatible con target ES2017 en `src/lib/pricing-bulk-service.ts`.
- `corepack pnpm build`: FAIL antes de compilar por error de parseo en el archivo ajeno modificado `src/lib/quote-repository.ts`.
- `corepack pnpm lint`: 0 errores, 18 warnings globales preexistentes.
- `git diff --check`: PASS; solo avisos normales de conversión LF/CRLF del worktree.
- `corepack pnpm test:inventory`: 19/20 tests pasan; falla el test de importación porque no existe el archivo XLSX canónico en la ruta esperada.
- Navegador del usuario (local): sesión existente autenticada como Superadmin; `/admin/inventario` carga el error controlado por `column inventory_reservations.reason does not exist`, sin bypass. La consola refleja ese error de servidor y warnings normales de Clerk/scroll.
- Navegador del usuario (dev): `https://dev.coldpower.pe/admin/dashboard` responde `502 Bad gateway` desde Cloudflare, por lo que no es verificable en ese entorno.
