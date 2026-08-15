# CP-027 Plataforma Operativa Integral ColdPower — Plan de implementación

> **Para agentes de implementación:** ejecutar este plan por bloques, usando `subagent-driven-development` o `executing-plans` cuando se inicie la implementación. Cada bloque debe pasar sus pruebas, typecheck, lint, build y QA runtime antes de abrir el siguiente.

**Objetivo:** convertir el catálogo persistente actual en una plataforma operativa integrada con cuentas, administración, CMS, inventario, precios, CRM, ventas, pedidos, pagos, WhatsApp, reportes y auditoría, manteniendo Neon/PostgreSQL como fuente de verdad.

**Arquitectura:** extender el esquema Drizzle existente y reutilizar Clerk, cotizaciones, catálogo, inventario/Kardex, reservas, transferencias y auditoría. Las entidades comerciales deben conservar snapshots de producto/precio y relacionarse con el cliente y la oportunidad; ninguna pantalla administrativa debe depender de datos ficticios ni de estado en memoria.

**Tecnologías:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS v4, Clerk, Drizzle ORM, Neon PostgreSQL, `tsx`, Node Test Runner y ESLint.

## Restricciones globales

- El libro `INVENTARIO CATALOGO/ColdPower_Inventario_Final_Validado.xlsx`, hoja `IMPORT_PRODUCTOS`, sigue siendo la única fuente del catálogo público y contiene exactamente 1,348 filas.
- Neon/PostgreSQL es la fuente de verdad; no se permiten arrays de productos, catálogos JSON, carritos en memoria ni persistencia silenciosa alternativa.
- SKU es único, indexado, inmutable y se actualiza por coincidencia exacta.
- Se preservan columnas fuente, nulos, trazabilidad, estado editorial y metadatos de revisión.
- La jerarquía es `category → family → product`.
- No se inventan precios, stock, compatibilidades, atributos técnicos, proveedores, teléfonos, correos ni datos empresariales.
- Toda operación sensible usa autorización server-side, transacción, idempotencia cuando corresponda y audit log append-only.
- Facturación electrónica, SUNAT, XML UBL, CDR y firma digital quedan fuera de CP-027; ACSOFT continúa siendo el sistema fiscal.
- No se hará commit ni push sin revisar el árbol de trabajo y sin autorización explícita.

## Auditoría inicial — 2026-08-12

### Estado actual comprobado

- Stack funcionando: Next.js 16.2.9, React 19.2.4, Drizzle, Neon, Clerk preparado por código, Tailwind v4.
- Migraciones existentes: `drizzle/0000_young_pet_avengers.sql` a `drizzle/0006_burly_killer_shrike.sql`.
- Tablas actuales: `categories`, `families`, `brands`, `products`, `product_relations`, `users`, `company_settings`, `quotes`, `quote_items`, `quote_status_history`, `quote_carts`, `locations`, `inventory_balances`, `inventory_movements`, `inventory_import_batches`, `transfers`, `transfer_items`, `inventory_reservations`, `audit_logs`.
- Roles declarados: `SUPERADMIN`, `JEFATURA`, `VENTAS`, `ALMACEN`, `COMPRAS`, `REPORTES`, además de compatibilidad `admin`/`customer`.
- Cotizaciones: persistentes, transaccionales, con snapshots, historial de estados, carrito persistente y cotización como invitado.
- Catálogo: persistente, filtrado server-side, paginado, separado por categoría/familia/marca, con reglas editoriales y duplicados.
- Inventario: dominio transaccional para ajustes, reservas, liberación, consumo, transferencias y recepción; Kardex y auditoría están modelados.
- Administración existente: resumen, catálogo editorial, cotizaciones, pedidos derivados de cotizaciones, inventario, compras informativas, reportes, auditoría y usuarios.
- Cuenta cliente existente: perfil, cotizaciones y una vista de pedidos derivados de cotizaciones.

### Estado de datos en Neon

- Productos: 1,348; SKUs únicos: 1,348; diferencias contra la fuente: 0.
- Categorías: 27; familias: 171; marcas: 60.
- Estado editorial: 1,348 en `review`; 0 publicados; catálogo público: 0.
- SKU de regresión `CP-REF-OTR-0435`: sigue en `review`, `requiresReview=true`, razón `Descripción insuficiente`.
- Posibles duplicados: 62 pendientes; no se ha realizado merge ni borrado físico.
- Locales, saldos, movimientos y audit logs: 0 filas.
- `company_settings`: sin datos reales configurados.
- `.env.local`: contiene `DATABASE_URL`; no contiene credenciales Clerk ni datos empresariales confirmados.

### Verificación ejecutada antes de implementar

- Contratos CP-025 y persistencia: pasaron.
- QA de catálogo: 1,348 filas, sin SKUs faltantes, inesperados ni duplicados.
- QA de fuente: 1,348/1,348, `mismatchCount=0`.
- `typecheck` y `lint`: pasaron dentro de `test:all`.
- `next build`: bloqueado únicamente por el entorno al descargar Google Fonts (`IBM Plex Sans` y `IBM Plex Mono` desde `fonts.googleapis.com`); no apareció error TypeScript/ESLint en esa ejecución.

## Matriz de módulos CP-027

| Módulo | Estado | Evidencia actual | Decisión |
|---|---|---|---|
| Clerk, login/register y webhook | Parcial | Rutas `sign-in`, `sign-up`, webhook y helpers existen; `.env.local` no tiene claves Clerk | Completar configuración, sincronización y pruebas reales en Bloque A |
| RBAC | Parcial | Roles mínimos y algunos permisos existen; permisos CP-027 granulares no existen | Rehacer matriz de permisos y corregir middleware para roles operativos |
| Catálogo y taxonomía | Existente | Neon, importador, filtros, paginación, publicación y duplicados | Extender edición comercial, relaciones y administración completa |
| CMS y contenido visual | Faltante | No hay tablas ni APIs para bloques, banners, hero o contenido editable | Crear CMS y media library en Bloque B |
| Media library | Faltante | Solo assets del repositorio y placeholders | Crear almacenamiento gobernado, metadatos, preview y reemplazo |
| Inventario, Kardex, locales, reservas y transferencias | Parcial | Modelo y servicios transaccionales existen; Neon está vacío | Crear operaciones administrativas completas y luego conectar pedidos |
| Precios e historial | Faltante | No existen tablas ni permisos de precios | Crear en Bloque C, sin cargar valores inventados |
| Descuentos | Faltante | No hay reglas configurables ni aprobaciones | Crear después de precios y antes de ventas |
| Clientes/CRM | Faltante | No existe entidad cliente ni historial comercial | Crear en Bloque D |
| Pipeline/oportunidades | Faltante | No existe entidad de oportunidad ni Kanban persistente | Crear en Bloque D |
| Seguimientos/tareas | Faltante | No existe modelo | Crear en Bloque D |
| Cotizaciones | Existente parcial | Persistencia y estados básicos existen; no están integradas con CRM/precio | Extender sin reconstruir en Bloque D |
| Ventas/pedidos | Faltante | “Pedidos” filtra cotizaciones aprobadas; no existe entidad order | Crear entidades independientes en Bloque E |
| Checkout/pagos | Faltante | No hay order, payment ni proveedor desacoplado | Crear contratos internos y pago manual auditado en Bloque E |
| WhatsApp | Parcial | Generador de enlace existe; no crea lead persistente antes de abrir | Integrar con oportunidad/lead y company settings |
| Panel cliente | Parcial | Perfil y cotizaciones; pedidos son una vista de quotes | Conectar a orders, payments e historial |
| Dashboard/reportes | Parcial | Resumen y embudo de cotizaciones | Construir métricas calculadas desde ventas, pedidos, inventario y CRM |
| Notificaciones | Faltante | No existe centro ni tabla | Crear en Bloque G; sin WhatsApp Business API |
| Promociones | Faltante | No existe entidad ni gobierno | Crear en Bloque G |
| Proveedores/compras | Faltante | Compras es pantalla informativa sin tablas | Crear en Bloque F |
| Importaciones internacionales | Faltante | No existe modelo | Dejar estructura futura en Bloque F, sin datos ficticios |
| Seguridad | Parcial | Validación de cotización, rate limit en memoria y guards parciales | Pasar rate limit a solución apropiada, validar uploads/webhooks y auditar todas las APIs |
| Responsive | Parcial | Web pública verificada; paneles operativos aún no tienen QA integral | Ejecutar QA desktop/tablet/móvil por bloque |

## Reutilización obligatoria

- `src/db/schema.ts`, `src/db/index.ts` y migraciones Drizzle como base única.
- `src/lib/auth.ts`, Clerk webhook y `src/lib/roles.ts`, ampliándolos sin crear otro sistema de login.
- `src/lib/catalog-repository.ts`, `src/lib/publication-governance.ts`, `src/lib/publication-service.ts` y el importador ACSOFT.
- `src/lib/quote.ts`, `/api/cotizacion`, `quotes`, `quote_items`, `quote_status_history` y `quote_carts`.
- `src/lib/inventory.ts`, `src/lib/inventory-domain.ts`, `src/lib/stock-import.ts` y las tablas actuales de inventario.
- `src/lib/audit.ts` y `audit_logs` como mecanismo append-only para todo cambio sensible.
- `company_settings` y `src/lib/company-settings.ts` como fuente única de datos empresariales.

## Migraciones necesarias

Las nuevas migraciones serán aditivas, reproducibles y aplicadas con `corepack pnpm db:migrate`, siempre después de un backup lógico:

1. **Bloque A:** completar permisos, invitaciones/asignaciones internas y campos de cuenta necesarios; mantener Clerk como identidad.
2. **Bloque B:** `media_assets`, `cms_pages`/`cms_blocks`, `banners`, relaciones de media con entidades y estados de publicación.
3. **Bloque C:** `price_lists`/`product_prices`, `price_history`, `discount_rules`, `discount_approvals`, y ampliaciones de inventario únicamente donde falten invariantes.
4. **Bloque D:** `customers`, `customer_activities`, `opportunities`, `opportunity_items`, `opportunity_stage_history`, `follow_ups`, `tasks`, y relación de quotes con cliente/oportunidad.
5. **Bloque E:** `sales`, `orders`, `order_items`, `payments`, `payment_events`/idempotencia, snapshots comerciales y estados de entrega.
6. **Bloque F:** `suppliers`, `purchase_orders`, `purchase_order_items`, `purchase_receipts`, importaciones y landed-cost futuro.
7. **Bloque G:** `notifications`, `promotions`, métricas/materializaciones solo si una consulta calculada no es suficiente.
8. **Bloque H:** índices, constraints, rate-limit/idempotencia, seguridad de archivos/webhooks y ajustes de producción.

## Dependencias y orden exacto

### Bloque A — cuentas, usuarios, roles y permisos

**Archivos principales:** `src/proxy.ts`, `src/lib/auth.ts`, `src/lib/roles.ts`, `src/app/admin/layout.tsx`, `src/app/admin/usuarios/page.tsx`, webhook Clerk y nuevas rutas de invitación/asignación.

**Entrega:** clientes pueden registrarse/iniciar sesión y cotizar como invitados; empleados solo son invitados/creados por administración; middleware acepta roles operativos autorizados; cada endpoint administrativo aplica permiso server-side.

**Pruebas:** permisos por rol, middleware con claims `metadata` y `publicMetadata`, invitación de empleado, sincronización Clerk→Neon, acceso prohibido a secretos y regresión de cotización invitada.

### Bloque B — catálogo administrativo, CMS y media

**Archivos principales:** `src/app/admin/catalogo/page.tsx`, nuevas rutas `/api/admin/catalogo`, `/api/admin/media`, `/api/admin/cms`, nuevos componentes admin y repositorios de media/CMS.

**Entrega:** editar nombre comercial sin destruir `originalName`, taxonomía, descripción, imágenes, hero, banners, promociones visuales, marcas y bloques públicos desde admin; preview y publicación gobernada.

**Pruebas:** CRUD autorizado, preview, reemplazo seguro, MIME/tamaño, alt text, no eliminación de media en uso, auditoría y exclusión de borradores del público.

### Bloque C — precios e inventario operativo

**Archivos principales:** `src/db/schema.ts`, `src/lib/inventory.ts`, `src/lib/stock-import.ts`, `src/app/admin/inventario/page.tsx`, nuevas páginas `/admin/precios` y `/admin/locales`.

**Entrega:** precios por producto y vigencia con historial; stock por local con `available = on_hand - reserved`; ajustes, Kardex, importación por SKU exacto, transferencias y reservas quedan operables desde admin.

**Pruebas:** transacciones, concurrencia, invariantes no negativas, auditoría, rollback, importación dry-run y bloqueo si faltan cantidad/ubicación.

### Bloque D — clientes, CRM, pipeline, tareas y cotizaciones

**Archivos principales:** nuevas librerías `src/lib/crm.ts`, `src/lib/opportunities.ts`, `src/lib/tasks.ts`; páginas `/admin/clientes`, `/admin/crm`, `/admin/pipeline`, `/admin/tareas`; ampliación de cotización existente.

**Entrega:** oportunidad por cliente con productos, Kanban persistente, drag-and-drop auditado, seguimientos, tareas vencidas y cotizaciones integradas.

**Pruebas:** transición válida de estados, actividad, próxima acción, días sin contacto, asociación de invitado a cuenta, snapshots y auditoría.

### Bloque E — ventas, pedidos, checkout, pagos y WhatsApp

**Archivos principales:** nuevas entidades/librerías `sales`, `orders`, `payments`; páginas públicas de checkout y panel cliente; `src/lib/whatsapp.ts` y rutas de webhook.

**Entrega:** cotización aceptada→venta→pedido→pago→preparación→entrega; reserva de stock; proveedor de pago abstracto sin guardar tarjetas; pago manual auditado; WhatsApp solo cuando exista número real y después de persistir lead.

**Pruebas:** idempotencia, reserva/liberación/consumo, snapshots de precio, estados, pago manual, webhook firmado y CTA sin número configurado.

### Bloque F — proveedores, compras y recepciones

**Archivos principales:** nuevas páginas `/admin/proveedores`, `/admin/compras`, `/admin/recepciones`; librería de compras.

**Entrega:** proveedor→orden→recepción parcial/total→`PURCHASE_RECEIPT` en Kardex; importaciones internacionales quedan preparadas sin valores ficticios.

**Pruebas:** recepción parcial, cantidades, idempotencia, auditoría y actualización atómica de inventario.

### Bloque G — dashboard, reportes, notificaciones y promociones

**Archivos principales:** `src/app/admin/page.tsx`, `/admin/reportes`, `/admin/notificaciones`, `/admin/promociones`, nuevas consultas agregadas.

**Entrega:** indicadores calculados desde Neon por periodo, local, vendedor, cliente, producto, categoría, familia, marca, canal y estado; notificaciones internas; promociones con vigencia y gobierno.

**Pruebas:** totales reconciliados, rangos de fecha, permisos, promoción fuera de vigencia, notificaciones unread/read/dismissed y ausencia de datos inventados.

### Bloque H — seguridad, responsive y preparación de producción

**Archivos principales:** `src/proxy.ts`, rutas API, validadores, uploads, webhooks, `next.config.ts`, `ops/`, checklist de despliegue.

**Entrega:** defensa server-side completa, rate limiting apropiado, uploads seguros, CSRF/XSS/SQL injection revisados, panel mobile/tablet/desktop, staging y rollback documentados.

**Pruebas:** `test:all`, typecheck, lint, build offline/estable, HTTP smoke, Playwright/Chrome, consola, rutas privadas, reintentos e idempotencia.

## Información que debe proporcionar el propietario

1. Datos legales: razón social, nombre comercial, RUC, dirección, teléfonos, correo, horarios, redes y enlaces legales.
2. Nombres/códigos de locales, almacenes, direcciones y reglas de stock mínimo.
3. Exportación ACSOFT con `SKU`, `locationCode` y `quantity` reales para cargar existencias sin inventarlas.
4. Lista real de empleados, email Clerk, rol inicial y permisos específicos.
5. Reglas de precios, listas minorista/mayorista, costos, vigencias y límites de descuento.
6. Clientes y vendedores que se puedan importar legalmente, con dueño de cada oportunidad.
7. Proveedor de pago que se desea evaluar; no se integrará ninguno sin confirmación.
8. Métodos manuales de pago realmente aceptados; Yape/Plin no se publicarán sin confirmación.
9. Reglas de despacho, recojo, cobertura, garantías y estados operativos.
10. Activos visuales autorizados: logo, hero, banners, imágenes de productos/categorías y textos finales.

## Riesgos técnicos

- La autenticación de producción está incompleta porque `.env.local` no tiene claves Clerk; no se debe probar el panel como si estuviera protegido en producción hasta configurarlo.
- El middleware actual solo acepta `role === "admin"` para entrar a `/admin`, mientras el dominio define roles operativos; esto debe corregirse antes de ampliar el panel.
- La base de datos está vacía en operaciones: cualquier dashboard de ventas, inventario, pagos o compras debe mostrar ausencia de datos, nunca ceros presentados como negocio real sin contexto.
- La cotización actual usa un rate limit en memoria; no es suficiente para múltiples instancias.
- Las pantallas `compras` y parte de `pedidos` son placeholders informativos o derivaciones de cotizaciones, no módulos ERP reales.
- El build depende actualmente de descargar Google Fonts; el diagnóstico del 2026-08-12 falló por red del entorno. Antes de producción debe existir una estrategia de fuentes local o un build con acceso controlado.
- El alcance es grande; intentar todos los bloques en una sola migración aumentaría el riesgo de datos y rollback.

## Rollback

- Antes de cada migración importante ejecutar `corepack pnpm db:backup` y conservar el JSON versionado fuera de la ruta pública.
- Aplicar migraciones aditivas; no usar `db:push` en producción.
- Revertir despliegue a la versión anterior si falla runtime.
- Para datos importados, usar lotes idempotentes y restaurar el backup lógico; nunca borrar historial de auditoría ni productos fuente.
- Cada bloque debe tener un script de verificación y un caso de regresión antes de pasar al siguiente.

## Próximo paso autorizado

Iniciar únicamente el **Bloque A**, después de confirmar los datos de Clerk y los empleados iniciales. El primer cambio técnico debe corregir la autorización server-side del middleware y completar permisos granulares con pruebas; no se deben crear todavía CMS, CRM, pedidos ni pagos.
