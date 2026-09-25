# Diseño — Admin / Promociones (prompt de Claude para Codex)

## Entregable
Dos imágenes de diseño de alta fidelidad, sin implementar código de la app todavía:
- `docs/goal/designs/promociones/promociones-desktop-1920x1080.png`: exactamente 1920×1080, zoom 100%.
- `docs/goal/designs/promociones/promociones-mobile-390x844.png`: exactamente 390×844.
- `docs/goal/designs/promociones/spec.md`: decisiones, componentes y mapeo de cada dato a su columna real de la base.

**Método:** usa tu **skill de generación de imágenes**. Si en este entorno no genera UI legible (texto nítido, números exactos), construye una **lámina HTML estática** en `docs/goal/designs/promociones/lamina/` con los tokens reales de `src/app/globals.css` (fuentes IBM Plex Sans/Mono) y captúrala con Playwright (`chromium`, headless, `deviceScaleFactor: 1`). Indica en `spec.md` qué método usaste. **No** toques `src/`.

## Quién la usa y para qué
- **Roles:**
  - GERENCIA y ADMIN (`promotions.manage`) crean y administran campañas;
  - GERENCIA aprueba (`pricing.discount.approve`);
  - SUPERADMIN ve todo.
- **Preguntas que la pantalla responde en 3 segundos:**
  1. ¿Qué campañas están activas **ahora** y cuáles **vencen pronto**?
  2. ¿Cuánto descuento estamos entregando y en qué canal (checkout de tienda o cotización)?
  3. ¿Qué campañas **chocan** sobre el mismo producto (dos exclusivas a la vez)?
  4. ¿Qué está **esperando aprobación**?
  5. Crear una campaña rápida **sin errores**: con alcance explícito, fechas correctas y la vista previa del precio final.
- **Regla de negocio visible:** "El precio base nunca se modifica": la promoción se aplica encima y queda registrada en `promotion_applications`.

## Datos reales disponibles (no inventes campos)
- **`promotions`:** `name`, `description`, `type` (PERCENTAGE | AMOUNT | SPECIAL_PRICE), `discountValue`, `startsAt`, `endsAt` (hora de Lima), `status` (DRAFT | ACTIVE | INACTIVE | EXPIRED), `priority` (entero), `policy` (EXCLUSIVE | BEST_VALUE | STACKABLE), `approvalStatus` (NOT_REQUIRED | PENDING | APPROVED | REJECTED), `approvedBy`, `approvedAt`, `bannerAssetId` (imagen opcional) y `createdBy`.
- **Alcance:** `promotion_products` (productos) y `promotion_categories` (categorías). Conteos por promoción.
- **Uso:** `promotion_applications`, con `contextType` (checkout | quote), `baseUnitPrice`, `discountAmount`, `finalUnitPrice`, `productId` y `createdAt`. Permite: aplicaciones en 30 días, descuento total entregado, desglose por canal y top productos.
- **"Programada"** se deriva: ACTIVE con `startsAt` en el futuro. **"Vence pronto"**: `endsAt` a 7 días o menos.
- **"Conflicto"** se deriva: un producto cubierto por 2 o más promociones vigentes y al menos una EXCLUSIVE.

## Composición desktop 1920×1080
Conserva el shell del admin:
- sidebar de unos 190 px, con el ítem activo en navy `#102f51` en el grupo **Comercial**;
- topbar de 76 px con la búsqueda global;
- gutter de 36 px y fondo `#f8fafc`.

1. **Encabezado:** "Promociones" (título) y el subtítulo "Campañas sobre el precio base, con vigencia, alcance y trazabilidad". A la derecha: `Exportar CSV` (secundario, borde `slate-200`) y **`Nueva promoción`** (primario `blue-600`, con icono +).
2. **Fila de KPIs**, 4 tarjetas `rounded-xl border-slate-200/90 shadow-2xs`, etiqueta `text-[10px] uppercase tracking-wide slate-400`, número `text-2xl font-bold slate-900`:
   - **Activas ahora:** número grande y línea amber "3 vencen en ≤ 7 días" (clic = filtro).
   - **Descuento entregado · 30 días:** "S/ 4,820.50", delta vs. los 30 días previos (▲/▼ con color) y sparkline de 30 puntos.
   - **Aplicaciones · 30 días:** número y una barra 100% apilada checkout vs. cotización, con leyenda.
   - **Por aprobar:** número en orange y "más antigua: hace 2 d" (clic = filtro). Si es 0, emerald "Todo al día".
3. **Calendario de campañas (8 semanas):** tarjeta ancha y compacta (unos 190 px de alto):
   - barras tipo Gantt por campaña, coloreadas por estado (emerald activa, blue programada, slate borrador, orange por aprobar);
   - marcador vertical "Hoy";
   - **solapamientos en conflicto con trama roja** y un chip "2 conflictos" que abre el detalle;
   - máximo 6 filas, más el enlace "Ver todas".
4. **Cola de campañas:** tarjeta con:
   - chips de estado **con conteo**: Todas · Activas · Programadas · Por aprobar · Borradores · Vencidas · Con conflicto;
   - búsqueda con icono, filtros "Tipo" y "Alcance" (producto o categoría), todo persistente en la URL.
   - **Columnas de la tabla:**
     - **Campaña:** miniatura 40×40 del banner (o el icono del tipo), nombre en negrita y descripción en 1 línea truncada;
     - **Beneficio:** badge grande "−15 %", "−S/ 20.00" o "Precio especial S/ 99.00";
     - **Alcance:** "12 productos · 2 categorías" (o "⚠ Sin alcance: aplica a todo" en amber);
     - **Vigencia:** rango "01 oct → 31 oct", barra de progreso delgada y "vence en 3 d" o "inicia en 5 d";
     - **Reglas:** chip de prioridad "P1" y chip de política (Exclusiva / Mejor valor / Combinable);
     - **Aprobación:** chip de estado;
     - **Uso 30 d:** "86 aplicaciones", y abajo "S/ 1,240.00";
     - **Acciones:** menú (Editar, Duplicar, Pausar/Activar, Archivar).
   - Fila seleccionada con fondo `blue-50/60` y borde izquierdo `blue-600`.
   - Paginación "25 de 48 campañas".
5. **Drawer de detalle** a la derecha, de unos 540 px, abierto sobre la campaña seleccionada:
   - **Encabezado:** nombre, chip de estado y beneficio grande.
   - **"Impacto en precio":** mini tabla de 5 productos (SKU en mono, precio base tachado, precio final y ahorro %).
   - **"Uso por canal":** checkout y cotización, con montos.
   - **"Conflictos":** tarjeta roja con los productos en choque y qué promoción gana según prioridad y política.
   - **"Historial":** timeline de auditoría (creada, aprobada, pausada), con usuario y hora de Lima.
   - **Pie fijo:** `Pausar` (secundario), `Editar` y `Aprobar` (solo con permiso y si está PENDING).

## Crear o editar (lámina adicional)
Tercera imagen, `promociones-form-desktop-1920x1080.png`: el formulario **en un drawer ancho (unos 720 px)**, no en un modal a pantalla completa.
- **Tres secciones numeradas:**
  1. **Beneficio:** selector segmentado de tipo y valor.
  2. **Alcance:** buscador de productos por SKU o nombre y de categorías, con chips removibles. **El alcance vacío muestra la advertencia "Aplicará a todo el catálogo"**, que exige confirmación.
  3. **Vigencia y reglas:** fechas en hora de Lima, prioridad, política, banner opcional y si requiere aprobación.
- **Columna derecha de vista previa en vivo:**
  - "Así se verá en la tienda": tarjeta de producto real con el precio tachado y el badge de la promoción;
  - "Validaciones": ✓ fechas coherentes, ✓ alcance definido, ⚠ 1 conflicto con "Liquidación verano" en 3 productos.

## Mobile 390×844
- KPIs en grilla 2×2.
- El calendario se reemplaza por la lista "Vencen pronto".
- La cola se convierte en tarjetas: nombre, beneficio, vigencia con barra y chip de estado.
- El detalle es una hoja de pantalla completa.
- El botón "Nueva promoción" queda fijo abajo.

## Estados que el spec.md debe describir
- **Vacío:** "Aún no hay campañas" con 2 plantillas rápidas: "Liquidación por categoría" y "Precio especial por SKU".
- **Carga:** skeleton con la misma geometría.
- **Error:** mensaje y "Reintentar".
- **Sin permiso de aprobar:** el botón Aprobar oculto y un chip informativo.

## Reglas de calidad (se rechaza la imagen si falla alguna)
- Nada genérico: cada bloque responde una de las 5 preguntas de arriba.
- Sin huecos muertos a 1920: ninguna tarjeta estirada sin contenido.
- Textos en español del Perú, montos `S/ 1,240.00`, fechas `dd mmm` y hora de Lima.
- Los datos de la imagen son de composición, verosímiles para repuestos de refrigeración (por ejemplo "Liquidación compresores R134a" o "Precio especial capacitores 35 µF"). No son fixtures.
- Contraste AA y jerarquía tipográfica clara (título 28–30 px, secciones 15–16 px semibold, cuerpo 13–14 px).
