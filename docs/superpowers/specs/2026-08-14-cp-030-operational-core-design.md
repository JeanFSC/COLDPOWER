# ColdPower Operational Core 3.0 — Diseño aprobado por CP-030

## Objetivo

Convertir el backend de ColdPower en la única fuente de verdad para catálogo,
inventario, precios, CRM, ventas, pedidos, pagos, CMS, reportes, auditoría y
RBAC, eliminando métricas de demostración del runtime sin rediseñar la UI ni
migrar la infraestructura.

## Límites

- Se conserva el catálogo ACSOFT de 1,348 filas y 1,348 SKU únicos.
- Se conservan los guards y roles canónicos de CP-028.
- Se trabaja con PostgreSQL/Neon y Drizzle mediante migraciones aditivas.
- No se mueve Neon a Hetzner, no se cambia DNS y no se implementa facturación SUNAT.
- El agente UI conserva layout y estilos; recibe contratos de datos y cambios mínimos de integración.

## Arquitectura

La aplicación se divide en tres capas: repositorios de lectura/escritura, servicios
de dominio transaccionales y rutas HTTP protegidas. Los servicios reciben el actor
autenticado, ejecutan la mutación en una transacción, escriben auditoría y devuelven
DTOs estables. Los reportes y el dashboard sólo consultan entidades persistidas y
aplican filtros en SQL; no reutilizan arrays de catálogo ni datos de presentación.

La semántica de disponibilidad es explícita: sin saldo cuantitativo persistido la
respuesta es `UNKNOWN`; `0` sólo significa saldo conocido igual a cero y `LOW` sólo
se calcula con saldo conocido y mínimo configurado. Las cotizaciones no reservan
inventario. Un pedido en `RECEIVED` reserva; `CANCELLED` libera; `DELIVERED`
consume; `PREPARING`, `READY` e `IN_TRANSIT` conservan la reserva.

## Persistencia y concurrencia

- Cada cambio de schema tiene migración, estrategia de rollback documentada y backup verificable previo.
- SKU, Clerk user id, códigos de cotización/venta/pedido e idempotency keys tienen unicidad persistente.
- Ajustes, reservas, conversiones de cotización, confirmaciones de pago y webhooks usan transacciones y locks cuando el saldo o estado pueda competir.
- El Kardex es append-only; una corrección crea contramovimiento y auditoría.
- Los campos before/after de auditoría se sanitizan antes de persistir.

## Estados y permisos

Los servicios aceptan los estados de negocio del ticket y mapean valores legacy sólo
en los bordes de lectura/escritura. Publicación pública exige `PUBLISHED`. Se mantiene
la matriz CP-028: `SUPERADMIN` todo, `GERENCIA` negocio completo,
`OPERACIONES_VENTAS` operación sin dashboard/reportes/costos/usuarios y `CUSTOMER`
únicamente sus registros. `pricing.cost.view`, `pricing.cost.edit` y
`pricing.margin.view` se mantienen separados; Bryan no obtiene ninguno de ellos.

## Observabilidad y errores

Las rutas devuelven `{ error: { code, message, details } }` en errores controlados y
no filtran stack traces. Las operaciones críticas registran eventos estructurados sin
secretos. `America/Lima` es la zona de presentación; PostgreSQL almacena timestamps
UTC.

## QA de aceptación

El cierre requiere pruebas de dominio, integración, contratos, RBAC, consistencia,
flujo Customer → Quote → Opportunity → Sale → Order → Payment → Delivery, TypeScript,
ESLint, build y smoke HTTP. No se acepta cierre si existen cifras hardcodeadas en
runtime, conversiones con denominador cero, inventario UNKNOWN presentado como LOW,
review/hidden público, falta de auditoría, Bryan con permisos de costos o acceso IDOR.
