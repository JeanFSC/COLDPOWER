# CP-050 — Fixtures de QA y matriz de permisos

Este documento describe fixtures reproducibles y sanitizados para probar el backend sin inventar cuentas Clerk ni datos de negocio. No contiene contraseñas, tokens, cookies, IDs de producción ni secretos.

## Roles canónicos

| Rol | Uso de QA | Acceso esperado |
|---|---|---|
| `SUPERADMIN` | Control total y protección del último superadmin | Todos los módulos, roles, exportaciones y acciones protegidas |
| `GERENCIA` | Gestión comercial y consulta ejecutiva | Dashboard, reportes, clientes, CRM, cotizaciones, ventas y exportaciones permitidas; sin control técnico/RBAC |
| `OPERACIONES_VENTAS` | Operación diaria/comercial | Catálogo, cotizaciones, clientes, CRM, ventas, pedidos y operaciones permitidas; sin costos, reportes ejecutivos, auditoría ni usuarios |
| `ALMACEN` | Compatibilidad operativa histórica | Inventario, ajustes, reservas, transferencias y operaciones de almacén; sin precios/costos ni RBAC |

`JEFATURA`, `ADMIN`, `VENTAS`, `COMPRAS` y `REPORTES` se conservan como valores de compatibilidad. La matriz central está en `src/lib/roles.ts`; los alias no deben usarse para elevar permisos.

## Fixtures reproducibles

Los tests runtime crean registros temporales con prefijos `cp050-` y correos `.invalid`, ejecutan la operación y limpian las filas creadas. En particular, `scripts/cp050-transactional-smoke.test.ts` cubre local, Kardex, reserva/liberación, CRM, proveedor, compra y recepción con reintentos idempotentes.

El test de webhook usa IDs temporales `user_cp050_` y eventos `msg_cp050_`, comprueba creación, actualización, eliminación, entrega fuera de orden, reintento y concurrencia, y elimina los usuarios/eventos temporales al terminar. Se conserva únicamente la auditoría append-only que corresponde al comportamiento probado.

## Matriz de acciones

| Acción | SUPERADMIN | GERENCIA | OPERACIONES_VENTAS | ALMACEN |
|---|---:|---:|---:|---:|
| Ver catálogo y disponibilidad | Sí | Sí | Sí | Sí |
| Publicar producto | Sí | Sí | No | No |
| Ver costos/precios internos | Sí | Sí | No | No |
| Gestionar clientes/CRM/cotizaciones | Sí | Sí | Sí | No |
| Ajustar/transferir/reservar inventario | Sí | No | No | Sí |
| Confirmar pagos manuales | Sí | Sí | No | No |
| Ver reportes ejecutivos | Sí | Sí | No | No |
| Exportar información permitida | Sí | Sí | Según permiso | Según permiso |
| Invitar trabajadores | Sí | Sí, sin elevar a `SUPERADMIN` | No | No |
| Cambiar roles o estados | Sí | No | No | No |
| Quitar al último `SUPERADMIN` activo | No | No | No | No |

La autorización se aplica en backend mediante `requireApiPermission` y los servicios de dominio. Los contratos negativos esperan `403`; validación `400`; entidad ausente `404`; conflicto de estado/idempotencia `409`; y dependencia no disponible `503` cuando corresponde.

## Estado de cuentas en el entorno actual

La base de QA contiene un único usuario Clerk vinculado con `SUPERADMIN` activo. No se fabricaron usuarios persistentes para los otros roles porque sin identidades Clerk reales no serían cuentas iniciables y podrían confundirse con usuarios empresariales. Para probar esos perfiles visualmente, el responsable debe crear/invitar cuentas desde Clerk y asignar el `roleCode` mediante el flujo administrativo autorizado; los tests de matriz y servicio ya cubren sus permisos sin depender de esas cuentas.
