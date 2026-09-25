# Diseño M10 lote 2 — Taxonomía · Detalle de producto · Detalle de proveedor · Configuración (prompt de Claude para Codex)

Solo diseño: no toques `src/`, la base, `.env.local` ni `proxy.ts`, y no levantes servidores de la app (los puertos 3003 y 3005 están ocupados). Sin commit.

**Método** (el mismo que en Promociones, aprobado): lámina HTML estática con los tokens reales (`src/app/globals.css`, IBM Plex Sans/Mono) y captura con Playwright (chromium headless, `deviceScaleFactor` 1). Verifica las dimensiones exactas.

**Referencias de calidad y shell:**
- `docs/goal/designs/promociones/promociones-desktop-1920x1080.png` (aprobado; iguala o supera ese nivel);
- lenguaje del admin en `docs/goal/META-10.md` §3 (slate, `blue-600` primario, **nunca** naranja como CTA del admin, tarjetas `rounded-xl border-slate-200/90 shadow-2xs`, etiquetas `text-[10px] uppercase`, códigos en mono, detalle en `AdminDrawer`).

**Shell idéntico** al real: sidebar de unos 198 px con grupos General / Comercial / Operación / Catálogo / Gestión, ítem activo navy `#102f51`, topbar de 76 px con búsqueda global y fondo `#f8fafc`. El bloque "¿Necesitas ayuda?" **no** tapa ítems del menú.

**Entregables** en `docs/goal/designs/m10-lote2/`: para cada pantalla, `<nombre>-desktop-1920x1080.png`, `<nombre>-mobile-390x844.png` y una sección en `spec.md` con el mapeo dato → columna real. Nada inventado. Los datos de la lámina son de composición, verosímiles para repuestos de refrigeración, HVAC y línea blanca en Perú. Montos `S/ 1,240.00`, fechas `25 set 2026` y hora de Lima.

**Reglas de calidad** (se rechaza la lámina si falla alguna): sin huecos muertos a 1920, sin paneles estirados, sin nombres internos (códigos de enum o IDs técnicos como texto principal), microcopy en español del Perú, y cada bloque responde una pregunta real del rol.

---

## 1. Taxonomía (`taxonomia`) — hoy 2/10
- **Hoy:** lista plana de más de 100 categorías con un botón "Desactivar" por fila; 14.000 px de alto. Además familias y marcas en la misma página, sin conteos, sin búsqueda y sin jerarquía.
- **Datos reales:**
  - `categories`, `families` (con `categoryId`) y `brands`: `name`, `slug`, `active`, fechas;
  - `products` referencia la taxonomía de origen (`categoryId`, `familyId`, `brandId`, importada del Excel) y la **editorial** (`editorialCategoryId`, `editorialFamilyId`, `editorialBrandId`), que la sobrescribe en la tienda;
  - conteos derivables: productos por nodo, publicados por nodo y sin marca.
- **Usuarios:** CATÁLOGO, ADMIN y SUPERADMIN. **Preguntas:** ¿cómo está organizado el catálogo (categoría → familia)? ¿Qué nodos están vacíos, duplicados o tienen productos sin publicar? ¿Qué marcas tienen más productos y cuántos productos no tienen marca? Crear, renombrar, mover o desactivar sin romper la tienda.
- **Composición desktop:**
  - encabezado "Taxonomía" (grupo Catálogo), con las acciones `Nueva categoría` (primario) y `Exportar`;
  - **KPIs:** Categorías activas (con inactivas), Familias, Marcas y "Productos sin marca" (amber, con clic a filtro);
  - **Layout maestro-detalle en 3 columnas:**
    - (a) **árbol** navegable Categoría → Familias, con conteo de productos por nodo, búsqueda que filtra el árbol, badge "Vacía" o "Inactiva" y reordenamiento no requerido;
    - (b) **panel del nodo seleccionado:** nombre y slug editables inline, productos totales / publicados / en revisión, lista compacta de familias hijas con conteos, top 5 marcas del nodo y acciones (Renombrar, Mover familia a otra categoría, Desactivar con **advertencia de impacto**: "12 productos publicados dejarán de mostrarse en /categoria/...");
    - (c) **marcas:** grilla o lista con buscador, conteo de productos y estado, y el detalle en drawer.
  - **Advertencias visibles:** familias vacías, nombres duplicados o similares ("Aire acondicionado" / "Aire Acondicionado") y categorías sin familias.
- **Mobile:** árbol colapsable, el detalle como hoja y las marcas en otra pestaña.

## 2. Detalle de producto en el admin (`catalogo/[id]`) — hoy 3/10
- **Hoy:** título, filtro de fechas sin propósito arriba, una tarjeta beige con dos formularios sueltos (precio y stock) con botones negros, y un input de archivo nativo en inglés ("Choose File").
- **Datos reales:**
  - `products`: SKU, `commercialName` / `normalizedName` / `originalName`, `modelCode`, marca, categoría y familia (origen y editorial), atributos técnicos (`voltage`, `power`, `frequency`, `rpm`, `amperage`, `capacitance`, `refrigerant`, `horsepower`, `temperature`, `dimensions`, `length`, `connectionSize`, `unitOfMeasure`), `application`, `compatibilityBrands`, `status`, `publicationStatus`, `availabilityStatus` y `editorialDescription`;
  - precios (`product_prices`: minorista, mayorista, mínimo, vigencias e historial);
  - stock por local (`inventory_balances`: físico, reservado, disponible y mínimo, más Kardex);
  - media (principal y galería);
  - relaciones explícitas (`product_relations`);
  - checklist de publicación y calidad de ficha (ya existe en el catálogo: nombre, categoría, familia, placeholder o imagen, precio);
  - promociones aplicables;
  - auditoría.
- **Preguntas:** ¿este producto está listo para publicarse? ¿Qué le falta? ¿Cuánto hay y dónde? ¿A qué precio y desde cuándo? ¿Cómo se ve en la tienda?
- **Composición desktop:**
  - **encabezado:** miniatura, nombre comercial, SKU mono, chips de estado (Publicado / En revisión, Disponible) y acciones `Ver en tienda`, `Publicar` (primario, deshabilitado con tooltip si el checklist falla) y menú (Duplicar, Archivar);
  - **columna izquierda (unos 2/3):** pestañas **Ficha** (datos técnicos en grilla de 2 columnas, editable inline, con marca de origen vs editorial), **Precios** (vigente con historial en timeline, "Nuevo precio" en drawer con motivo), **Inventario** (tabla por local: físico, reservado, disponible, mínimo y estado; "Ajustar" en drawer y últimos movimientos), **Imágenes** (dropzone en español, principal y galería, alt text) y **Historial**;
  - **columna derecha fija:** **"Preparación para publicar"** (checklist con ✓ o ⚠ y enlace al campo que falta, más la nota de calidad %), **"Vista en tienda"** (tarjeta real de producto como la ve el cliente) y **Promociones activas** que lo afectan.
  - Sin filtro de fechas arriba: el periodo solo aparece en Historial.

## 3. Detalle de proveedor (`compras/proveedores/[id]`) — hoy 4/10
- **Hoy:** contenedor angosto centrado (media pantalla vacía), KPIs "N/D" y datos "N/D".
- **Datos reales:**
  - `suppliers`: `name`, `identification` (RUC), `country`, `contactName`, `whatsapp`, `email`, `address`, `currency`, `notes` y `status`;
  - órdenes de compra y recepciones (`purchases`, `purchase_items` y las recepciones reales del esquema), con fill rate, on-time y lead time calculables;
  - productos comprados a este proveedor con su último costo;
  - incidencias.
- **Preguntas:** ¿es confiable (puntualidad, completitud)? ¿Qué le debo o qué tengo pendiente de recibir? ¿Qué le compro y a qué costo? ¿Cómo lo contacto ya?
- **Composición desktop a ancho completo** (mismo gutter que los demás módulos):
  - **encabezado:** nombre, RUC mono, país, moneda, chip de estado y acciones `Crear OC` (primario), `WhatsApp` (si hay número) y `Editar`;
  - **KPIs con contexto:** OC abiertas (monto), On-time % (con n de entregas), Fill rate %, Lead time promedio (días) e Incidencias 90 días. **Cuando no hay datos**, en lugar de "N/D" muestra "Sin entregas registradas aún" con ayuda;
  - **grid:** "Órdenes abiertas" (tabla compacta con estado y fecha esperada, y "retrasada" en rojo), "Recepciones recientes" (timeline), "Productos que suministra" (SKU, último costo, variación y última compra) y **"Contacto"** (tarjeta con acciones de un toque: llamar, WhatsApp, correo; los campos vacíos se muestran como "Agregar teléfono", editable).
  - **Estado vacío realista** para un proveedor nuevo.

## 4. Configuración (`configuracion`) — hoy 6/10
- **Hoy:** pestañas y tarjetas correctas, pero:
  - KPIs sin sentido ("Locales 6 · 0.0% vs. período anterior" con sparkline, "Listas de precio 2 · Sin base comparable");
  - el asterisco de obligatorio cae en una línea aparte debajo de la etiqueta;
  - "Probar integración" como primario en la pestaña Empresa;
  - estilos de tienda (tipografía grande, bordes gruesos).
- **Datos reales:** configuración de empresa (razón social, RUC, nombre comercial, correo, teléfono, WhatsApp, dirección fiscal con país / departamento / provincia / distrito, web, horario, logo, favicon y colores), locales, series documentales, precios e IGV (`tax_rate`, `tax_mode`; solo SUPERADMIN), integraciones (SUNAT, WhatsApp, SMTP, pasarela, API: estado real), versiones con restauración y el flag de páginas legales.
- **Preguntas:** ¿qué falta configurar para operar y facturar? ¿Qué está conectado? Editar con seguridad (versionado, quién cambió qué).
- **Composición desktop:**
  - **sin KPIs de tendencia.** Arriba, una **barra de "Completitud de configuración"**: "Empresa 6/9 campos · Locales 6 · Series 0 ⚠ · IGV sin configurar ⚠ · Integraciones 0/5", cada ítem enlazado a su pestaña. Es el primer bloque útil;
  - **pestañas:** Empresa · Locales · Series y documentos · Precios e IGV · Integraciones · Branding · Legal · Historial;
  - **pestaña Empresa:** formulario de 2 columnas con etiqueta y asterisco **en la misma línea**, ayuda contextual bajo el campo, validación de RUC con el mensaje real (módulo 11) y vista previa "Así aparece en documentos y en el pie de la tienda" en la columna derecha. La barra de guardado es **pegajosa abajo**, solo cuando hay cambios ("3 cambios sin guardar · Descartar · Guardar"). El botón primario es **Guardar**; "Probar integración" vive solo en la pestaña Integraciones;
  - **pestaña Precios e IGV** (solo SUPERADMIN): tasa vacía por defecto con la sugerencia 18%, modalidad (precios con / sin IGV incluido) y un ejemplo de desglose en vivo.

Mobile para las 4, con el mismo criterio: nada cortado y acciones al alcance del pulgar.
