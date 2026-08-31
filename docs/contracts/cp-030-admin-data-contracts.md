# CP-030 — Contrato de datos para las 14 pantallas administrativas

Todos los endpoints protegidos devuelven errores con esta forma:

```json
{ "error": { "code": "FORBIDDEN", "message": "No autorizado.", "details": {} } }
```

Las listas usan `{ items, page, pageSize, totalItems, totalPages }`. Una lista sin
registros devuelve `items: []`, `totalItems: 0` y `totalPages: 1`; nunca inventa
filas, páginas, porcentajes ni cantidades. Las fechas se presentan en
`America/Lima`. El público sólo recibe productos/CMS `PUBLISHED`.

| Pantalla | Endpoint | Método | Permiso | Parámetros | Respuesta y estado vacío |
|---|---|---:|---|---|---|
| Dashboard | `/api/admin/dashboard` | GET | `dashboard.view` | `from`, `to`, `locationId`, `sellerId`, `customerId`, `productId`, `categoryId`, `familyId`, `brandId`, `channel` | `DashboardSnapshot`; ventas, pipeline, pedidos, pagos y alertas en `0` o `null` según denominador; series `[]` si no hay hechos |
| Operaciones | `/api/admin/dashboard` | GET | `operations.view` | mismos filtros | snapshot operativo real; inventario sin balance = `UNKNOWN`, no bajo |
| Catálogo | `/api/admin/catalogo/:id` y `/api/admin/catalogo/:id/publication` | GET/PATCH | `catalog.product.view`, `catalog.product.edit`, `catalog.publication.manage` | `page`, `pageSize`, `query`, `sku`, estado editorial | producto conservando `original`, `normalized`, `commercial`, source y duplicado; publicación no aprobada no es pública |
| Inventario | `/api/admin/inventario/*` | GET/POST/PATCH | `inventory.view`, `inventory.adjust`, `inventory.transfer`, `inventory.reserve` | local, SKU, estado, razón, notas, actor | balances/movimientos/traslados/reservas; sin filas cuantitativas = desconocido; Kardex append-only |
| CRM clientes | `/api/admin/clientes` | GET/POST/PATCH | `crm.customer.view`, `crm.customer.edit` | `query`, `type`, `status`, `page`, `pageSize` | `items: []` cuando no haya clientes; customer interno enlazado a Clerk por `userId` |
| CRM pipeline | `/api/admin/oportunidades` | GET/POST/PATCH | `crm.opportunity.view`, `crm.opportunity.edit` | etapa, cliente, vendedor, fechas, page | métricas de oportunidades reales; cero oportunidades = total `0`, conversión `null` |
| Cotizaciones | `/api/admin/cotizaciones/:id` | GET/PATCH/POST | `quotes.view`, `quotes.edit`, `quotes.convert` | estado, cliente, page | snapshots persistidos; conversión idempotente; sin cotizaciones = `0` |
| Ventas | `/api/admin/ventas` | GET/POST/PATCH | `sales.view`, `sales.manage` | fechas, cliente, vendedor, estado, page | ventas sólo desde `sales`/`sale_items`; cancelación conserva razón, actor y fecha |
| Pedidos | `/api/admin/pedidos/:id` | GET/PATCH | `orders.view`, `orders.manage` | estado, local, cliente, page | estados `RECEIVED`, `PREPARING`, `READY`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`; sin pedidos no hay entregados |
| Pagos | `/api/admin/pagos/manual` y `/api/pagos/webhook/:provider` | POST | `payments.manual.confirm` / proveedor verificado | pedido, método, importe, evidencia, idempotency key | estados `PENDING`, `UNDER_REVIEW`, `CONFIRMED`, `REJECTED`, `REFUNDED`, `CANCELLED`; sin pagos = `0` |
| CMS | `/api/admin/cms/:slug` y `/api/cms/:slug` | GET/PATCH | `cms.view`, `cms.edit`, `cms.publish` | slug, draft/preview | preview puede leer draft; público sólo published; banners validan placement, order, ventana y link |
| Reportes | `/api/admin/dashboard` | GET | `reports.view` | rango, fechas, local, vendedor, cliente, producto, categoría, canal | fórmulas documentadas; ticket/conversión/margen `null` cuando falta denominador/datos |
| Auditoría | `/api/admin/auditoria` | GET | `audit.view` | actor, entidad, acción, fechas, page | eventos persistidos; intentos fallidos sólo si hay fuente real; before/after sanitizado |
| Usuarios | `/api/admin/usuarios/:id` | GET/PATCH | `users.view`, `users.manage` | roleCode, status, page | contadores agrupados por `users.roleCode/status`; usuario desactivado no cuenta como activo |
| Configuración | `/api/admin/configuracion` | GET/PUT | `company.settings.manage` | campos tipados de empresa | una fila tipada; campos ausentes son `null`, nunca `ColdPower` genérico |

## Reglas de integración

- El agente UI no debe calcular métricas a partir de la página visible; consume los DTOs.
- No usar `email` como vínculo permanente del portal: usar `customers.user_id`/ID interno.
- `OPERACIONES_VENTAS` no puede invocar dashboard/reportes/usuarios/costos ni confirmar pagos manuales.
- Las imágenes son referencias de media (`key`, URL, hash y metadatos); no se guardan blobs grandes en PostgreSQL.
