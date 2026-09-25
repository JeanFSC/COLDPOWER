# Admin / Promociones — handoff visual

Estado: **diseño visual listo para aprobación de Claude**. Esta entrega no implementa la ruta ni modifica `src/`, la base de datos, `.env.local` o `proxy.ts`.

## Entregables y método

- [Desktop — gestión + drawer](./promociones-desktop-1920x1080.png) — `1920 × 1080`.
- [Desktop — crear promoción](./promociones-form-desktop-1920x1080.png) — `1920 × 1080`.
- [Mobile — cola operativa](./promociones-mobile-390x844.png) — `390 × 844`.
- Fuente reproducible: [`lamina/promociones.html`](./lamina/promociones.html).
- Captura: [`lamina/render.cjs`](./lamina/render.cjs).

Se usó una **lámina HTML estática + Playwright**, no generación raster por IA: la pantalla exige texto en español, montos y estados legibles y exactos. El script abre `chromium` en modo `headless`, usa `browser.newContext({ viewport, deviceScaleFactor: 1 })`, locale `es-PE`, zona horaria `America/Lima`, espera `document.fonts.ready` y captura sin `fullPage`. El lockup de ColdPower se consume desde `public/brand/logo-coldpower-lockup.webp`; la iconografía es un sprite local basado en Lucide. No se generaron placeholders de marca ni imágenes operativas ficticias.

Los nombres, SKU, montos, fechas y conteos visibles son **datos de composición**, no fixtures ni datos operativos. La futura implementación debe sustituirlos por consultas PostgreSQL y mantener los estados honestos.

## Objetivo y decisión de diseño

La superficie responde en tres segundos a cinco preguntas: qué está activo o por vencer, cuánto descuento se está entregando y por qué canal, dónde existen conflictos, qué requiere aprobación y cómo crear una campaña sin romper vigencia, alcance o precio final.

La decisión principal es convertir Promociones en un centro de control, no en una tabla CRUD:

1. KPIs con contexto temporal y tendencia.
2. Calendario de ocho semanas para vigencia y solapamientos.
3. Cola con filtros persistentes, información de decisión y fila seleccionada.
4. Drawer contextual que deja visible la cola y concentra impacto de precio, uso, conflicto e historial.
5. Formulario en drawer ancho, con alcance explícito y vista previa del precio final antes de crear.

La regla visible en todos los estados relevantes es: **“El precio base nunca se modifica”**. La promoción se aplica encima y queda registrada en `promotion_applications`.

## Lenguaje visual

Se siguen la sección 3 de `META-10.md`, la especificación compartida de `docs/goal/designs/comercial/spec.md` y la referencia de shell de pagos.

| Token / patrón | Uso |
| --- | --- |
| `#f8fafc` / `slate-50` | fondo del workspace |
| `#ffffff` | superficies, drawers y controles |
| `#102f51` | navegación activa y shell |
| `#2563eb` / `blue-600` | acciones primarias, selección, marcador “Hoy” |
| `slate-900`, `slate-700`, `slate-500`, `slate-400` | jerarquía de texto |
| `slate-200/90` | bordes de tarjetas, tabla y drawer |
| emerald | activo, aprobado, validación correcta |
| amber/orange | vence pronto, pendiente, aprobación pendiente |
| rose/red | conflicto, riesgo y error |
| violet | cotización y canal secundario |
| IBM Plex Sans | interfaz, títulos, etiquetas y estados |
| IBM Plex Mono | SKU, códigos y referencias técnicas |
| `rounded-xl`, `shadow-2xs` | tarjetas administrativas; sin `rounded-pill` de tienda |

## Composición y componentes

### Shell desktop

- Sidebar fija de `198 px`, topbar de `76 px`, fondo de página `#f8fafc`, gutter izquierdo de `36 px`.
- El ítem `Promociones` queda activo dentro de `Comercial` con `#102f51`.
- La búsqueda global permanece en el topbar; el contenido no la repite.
- El drawer de detalle ocupa `540 px` y conserva la cola visible.

### Gestión desktop

- `AdminPageHeader`: breadcrumb `Comercial / Operaciones`, título, explicación de una línea, `Exportar CSV` y `Nueva promoción`.
- `PromotionKpiGrid`: cuatro tarjetas compactas. Cada una responde una pregunta: actividad, valor entregado, mix de canal y aprobación pendiente. Las tarjetas no se estiran sin contenido.
- `PromotionTimeline`: calendario de ocho semanas con barras por estado, marcador `Hoy`, leyenda y trama roja para conflictos. El chip `2 conflictos` abre el contexto de conflicto.
- `PromotionQueue`: chips con conteo, búsqueda por nombre/descripción, filtros `Tipo` y `Alcance`, y paginación. Los filtros deben conservarse en la URL.
- `PromotionTable`: columnas Campaña, Beneficio, Alcance, Vigencia, Reglas, Aprobación, Uso 30 d y acciones. La fila seleccionada usa fondo `blue-50/60` y borde izquierdo `blue-600`.
- `PromotionDetailDrawer`: campaña, beneficio, vigencia, alcance, reglas, impacto de cinco productos, uso por canal, conflictos y timeline de auditoría. El footer separa `Pausar` y `Editar`; `Aprobar` sólo aparece bajo la condición de permisos indicada abajo.

### Crear / editar desktop

- `PromotionFormDrawer`: drawer lateral de aproximadamente `720 px`; no es modal de pantalla completa.
- `BenefitSection`: nombre, tipo segmentado `PERCENTAGE | AMOUNT | SPECIAL_PRICE` y valor.
- `ScopeSection`: búsqueda por SKU/nombre y por categoría, chips removibles y confirmación explícita cuando el alcance está vacío.
- `RulesSection`: inicio/fin en hora de Lima, prioridad, política, banner opcional y requisito de aprobación.
- `LivePricePreview`: producto real, precio base tachado, precio final y badge del beneficio.
- `ValidationSummary`: fechas coherentes, alcance definido y conflictos que deben resolverse antes de activar.
- `PublicationGuardrails`: recordatorio de precio base intacto, hora de Lima y auditoría.

### Mobile `390 × 844`

- Sidebar oculta; topbar compacto con menú, lockup, notificaciones y avatar.
- `PromotionKpiGrid` en 2 × 2.
- `PromotionTimeline` se reemplaza por `SoonToExpireList`.
- La cola se vuelve `PromotionCardList`: nombre, beneficio, alcance resumido, vigencia, barra y chip de estado.
- `Nueva promoción` queda fijo en la parte inferior con área táctil suficiente.
- Al seleccionar una campaña, `PromotionDetailDrawer` se transforma en una hoja de pantalla completa; el botón de cierre recibe foco inicial y `Escape` la cierra.

## Mapeo de datos a persistencia

Fuente primaria del dominio: `src/db/operations-schema.ts`. La lectura existente está concentrada en `src/lib/promotion-repository.ts`; la aplicación y persistencia de efectos vive en `src/lib/promotion-service.ts`.

| Dato visual / regla | Fuente real | Transformación permitida |
| --- | --- | --- |
| Nombre de campaña | `promotions.name` | texto directo; truncar sólo en tabla con tooltip |
| Descripción | `promotions.description` | `NULL` se presenta como estado honesto, no como claim inventado |
| Tipo de beneficio | `promotions.type` | `PERCENTAGE` → porcentaje; `AMOUNT` → monto; `SPECIAL_PRICE` → precio especial |
| Valor del beneficio | `promotions.discountValue` (`discount_value`) | formatear según `type`; no recalcular ni redondear en cliente |
| Badge `−15 %`, `− S/ 20.00`, `S/ 99.00` | `type` + `discountValue` | sólo presentación localizada; moneda debe venir del contrato de precios si aplica |
| Estado persistido | `promotions.status` | valores `DRAFT`, `ACTIVE`, `INACTIVE`, `EXPIRED` |
| Estado efectivo | `promotions.status` + `startsAt` + `endsAt` | usar la derivación de `effectivePromotionStatus`; no mostrar “Activa” si todavía no comenzó o ya terminó |
| `Programada` | `promotions.status = ACTIVE` y `startsAt > now` | estado derivado, no columna nueva |
| `Vence pronto` | `promotions.endsAt` | `endsAt - now <= 7 días` y fecha todavía vigente |
| Aprobación | `promotions.approvalStatus` (`approval_status`) | `NOT_REQUIRED`, `PENDING`, `APPROVED`, `REJECTED`; no tratar aprobación como el estado de vigencia |
| Aprobador y fecha | `promotions.approvedBy`, `promotions.approvedAt` | resolver nombre sólo mediante identidad autorizada; el schema actual no declara FK para `approvedBy` |
| Creador / actualizador | `promotions.createdBy`, `promotions.updatedBy` | resolver identidad con permisos; nunca confiar en nombre enviado por el cliente |
| Banner | `promotions.bannerAssetId` → `media_assets.id` | si es `NULL`, usar icono del tipo; no inventar una imagen de campaña |
| Prioridad | `promotions.priority` | entero directo; mostrar como `P1`, `P2`, etc. sólo como convención visual del diseño |
| Política | `promotions.policy` | `EXCLUSIVE` → Exclusiva; `BEST_VALUE` → Mejor valor; `STACKABLE` → Combinable |
| Conteo de productos | `promotion_products.promotionId` + `promotion_products.productId` | `countDistinct(productId)` por campaña |
| Conteo de categorías | `promotion_categories.promotionId` + `promotion_categories.categoryId` | `countDistinct(categoryId)` por campaña |
| Alcance vacío | ausencia de filas en ambas tablas de alcance | advertencia obligatoria: `Aplicará a todo el catálogo`; requiere confirmación antes de guardar/activar |
| Nombre/SKU del producto | `promotion_products.productId` → `products.id` → columnas canónicas del catálogo (`sku`, nombre comercial) | sólo mostrar productos existentes y validados |
| Aplicaciones 30 d | `promotion_applications.promotionId` + `createdAt` | contar filas con `createdAt >= now - 30 días` |
| Descuento entregado 30 d | `promotion_applications.discountAmount` + `createdAt` | `SUM(discountAmount)`; no sumar precios finales |
| Aplicaciones por canal | `promotion_applications.contextType` + `discountAmount` + `createdAt` | separar `checkout` y `quote`; los canales visibles son una traducción de esos valores |
| Precio base del impacto | `promotion_applications.baseUnitPrice` | mostrar tachado; no sustituirlo por precio promocional |
| Ahorro absoluto | `promotion_applications.discountAmount` | valor persistido por aplicación |
| Precio final | `promotion_applications.finalUnitPrice` | valor persistido por aplicación; no presentar una predicción como aplicada |
| Producto del impacto | `promotion_applications.productId` → `products.id` | join autorizado para nombre/SKU |
| Conflicto | promociones vigentes + alcance en `promotion_products`/`promotion_categories` + `policy` | derivar cuando un producto queda cubierto por 2+ promociones vigentes y al menos una es `EXCLUSIVE`; mostrar qué gana según la regla de prioridad/política del servicio |
| Histórico | `audit_logs` con `entityType = promotion` y `entityId = promotions.id` | traducir acciones, actor y `createdAt` a timeline en hora de Lima; no fabricar eventos a partir del render |
| Filtros persistentes | `query`, `status`, `type`, `productId`, `categoryId`, `startsFrom`, `endsTo`, `page`, `pageSize` | conservar los parámetros aceptados por `parsePromotionFilters`; `Alcance` es un filtro derivado de las tablas de relación |
| Paginación | `limit`, `offset`, `totalItems`, `totalPages` del repositorio | mostrar conteo real, nunca “48” fijo en producción |

### Métricas derivadas

- `Activas ahora`: promociones con `status = ACTIVE`, `startsAt <= now` y `endsAt > now`.
- `Por aprobar`: promociones cuyo `approvalStatus = PENDING`; la antigüedad usa `createdAt` o el primer evento de aprobación pendiente disponible, no una fecha inventada.
- `Tasa de canal`: aplicaciones checkout / total y quote / total para la misma ventana temporal; si el total es cero, mostrar empty state en lugar de `0%` ambiguo.
- `Conflicto`: calcular en servidor sobre alcance y vigencia. El cliente sólo presenta el resultado y la explicación de qué promoción gana.
- `Precio especial`: el precio final debe contrastarse con `baseUnitPrice` en la vista previa del endpoint de preview; la vista no confirma persistencia hasta recibir la respuesta del servidor.

## Permisos y acciones

| Acción | Permiso / condición | Comportamiento visual |
| --- | --- | --- |
| Ver y administrar campañas | `promotions.manage` | cargar la superficie; sin permiso no mostrar datos parciales |
| Exportar CSV | `promotions.export` | ocultar `Exportar CSV` si falta el permiso |
| Aprobar / rechazar | `pricing.discount.approve` + `approvalStatus = PENDING` | mostrar `Aprobar` sólo en esa condición; si no hay permiso, ocultarlo y mostrar chip informativo |
| Crear / editar / pausar | `promotions.manage` + transición válida del servidor | estado de éxito o rechazo inline; impedir doble envío mientras espera respuesta |
| Activar campaña | estado, fechas, alcance, aprobación y conflicto válidos | no prometer activación; mostrar el error de dominio y pedir recarga si existe conflicto de versión/estado |
| Acciones de fila | permiso de administrar + registro válido | menú `Editar`, `Duplicar`, `Pausar/Activar`, `Archivar`; cada mutación debe ser real e idempotente |
| SUPERADMIN | permisos de su rol | ve la superficie completa, sujeto a los mismos estados del servidor |

## Estados obligatorios

- **Vacío:** dentro de la cola, `Aún no hay campañas`; mostrar dos plantillas rápidas: `Liquidación por categoría` y `Precio especial por SKU`. Las plantillas sólo precargan un borrador y no crean una campaña sin confirmación.
- **Carga:** skeleton con la geometría de KPIs, timeline/`Vencen pronto`, filtros, cards/tabla y drawer. No desplazar el layout ni mostrar números inventados.
- **Error:** alerta inline con `No se pudieron cargar las promociones` y acción `Reintentar`. No presentar métricas parciales como confirmadas.
- **Sin permiso de aprobar:** ocultar `Aprobar` y mostrar un chip informativo, por ejemplo `Requiere permiso pricing.discount.approve`.
- **Conflicto:** tarjeta rose con productos afectados, promociones involucradas y regla ganadora; nunca esconderlo dentro de un color sin texto.
- **Éxito:** confirmación inline después de que la mutación y su auditoría hayan sido persistidas; devolver foco al registro que abrió la acción.
- **Confirmación destructiva:** pausar, archivar o cambiar una campaña activa requiere motivo/confirmación según el contrato del endpoint.

## Accesibilidad y responsive

- Drawer con `role="dialog"`, nombre accesible, foco inicial en cerrar, foco atrapado y cierre por `Escape`.
- Todas las acciones táctiles y controles móviles deben tener al menos `44 × 44 px` de área hitbox.
- Estados siempre combinan texto/icono con color.
- Tabla desktop debe usar encabezados semánticos; las cards mobile conservan el orden de lectura Campaña → Beneficio → Vigencia → Estado.
- Truncamientos deben conservar tooltip o nombre completo accesible.
- La captura mobile validada no tiene overflow horizontal (`scrollWidth = 390`).

## Validación realizada

Captura reproducida el 25 sep 2026 con Chromium headless, `deviceScaleFactor: 1`:

| Vista | Viewport CSS | DPR | PNG verificado | Overflow | Consola |
| --- | ---: | ---: | ---: | ---: | --- |
| Desktop gestión | `1920 × 1080` | `1` | `1920 × 1080` | `scrollWidth = 1920` | 0 errores |
| Desktop formulario | `1920 × 1080` | `1` | `1920 × 1080` | `scrollWidth = 1920` | 0 errores |
| Mobile cola | `390 × 844` | `1` | `390 × 844` | `scrollWidth = 390` | 0 errores |

También se comprobó visualmente la fuente de referencia de pagos contra el shell generado: sidebar, topbar, gutter, superficie clara, navegación activa navy y drawer lateral permanecen en la misma familia; la diferencia está en una densidad útil mayor y una jerarquía específica para promociones.

## Gate de implementación

Estas láminas no autorizan todavía cambios en `src/components/admin/*`. Antes de implementar, Claude debe aprobar la dirección y el equipo debe traducir los componentes a datos reales, endpoints, permisos, estados de carga/vacío/error/conflicto, deep-links, teclado, moneda PEN y ausencia de paneles estirados.
