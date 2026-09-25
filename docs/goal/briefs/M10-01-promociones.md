# M10-01 — Implementar Admin / Promociones según el diseño aprobado (Codex)

Protocolo: `docs/goal/ORQUESTACION.md`. Meta: `docs/goal/META-10.md` (rúbrica §1, lenguaje del admin §3).
**Diseño aprobado por Claude con correcciones:**
- `docs/goal/designs/promociones/promociones-desktop-1920x1080.png`
- `promociones-form-desktop-1920x1080.png`
- `promociones-mobile-390x844.png`
- `spec.md`

La imagen es la **especificación** (AGENTS.md: fidelidad profesional). Usa la skill `product-design:image-to-code`.

## Correcciones obligatorias sobre las láminas (aplícalas en la implementación)
1. **Calendario:**
   - la leyenda va **dentro** de la tarjeta, en su pie;
   - ninguna fila cortada: altura según las filas visibles (máx. 6) o "Ver todas";
   - la tarjeta no se superpone con la cola.
2. **Sin nombres internos en la UI:** nunca `PERCENTAGE` ni `discountValue`. Usa "Porcentaje sobre precio base", "Monto fijo de descuento" o "Precio especial".
3. **Montos siempre** `S/ 1,240.00`: dos decimales, separador de miles y `formatMoney` existente, también en mobile y en la tabla "Impacto en precio".
4. **"Impacto en precio":**
   - SKU en mono;
   - el nombre ocupa el ancho disponible (truncado con tooltip);
   - base tachada → final → ahorro %, con columnas numéricas alineadas a la derecha y anchos balanceados.
5. **Formulario, mensajes de alcance:** éxito en emerald o neutro; **ámbar solo para advertencias** (sin alcance = aplica a todo).
6. **Formulario, columna de vista previa:** debajo de "Validaciones", agrega **"Impacto estimado"** (productos afectados, descuento promedio % y S/, y los conflictos con enlace a la campaña en choque). Sin columna vacía.
7. **Prioridad:** un selector claro "Prioridad 1–5 (1 gana)", con ayuda contextual; nada de "P2 · 20". Si el modelo usa un entero libre, mapea 1–5 a la UI y documenta el mapeo.
8. **Migas de pan:** "Comercial".
9. **Acciones:** quita "Ver reglas", o reemplázalo por un enlace real a `/admin/precios#reglas-descuento` con el texto "Reglas de descuento".

## Datos (servidor; nada inventado)
Extiende `src/lib/promotion-repository.ts`, con consultas paralelas y paginación en servidor:
- **Métricas:**
  - activas ahora;
  - por vencer en 7 días o menos (Lima);
  - por aprobar y la más antigua;
  - aplicaciones en 30 días por `contextType` (checkout | quote);
  - descuento entregado en 30 días y en los 30 previos;
  - serie diaria de 30 puntos para el sparkline;
  - conflictos: productos con 2 o más promociones vigentes y al menos una EXCLUSIVE.
- **Calendario:** campañas que se cruzan con la ventana de hoy − 7 días a hoy + 49 días, con los tramos en conflicto.
- **Por fila:** productos y categorías, uso en 30 días (aplicaciones y S/), banner (miniatura desde `media_assets`) y estado derivado (Programada / Vence pronto).
- **Detalle:**
  - top 5 del impacto en precio, desde el precio vigente del producto (fuente de precios actual) aplicando la promoción con la función existente `applyPromotionToUnitPrice`;
  - uso por canal;
  - conflictos (quién gana según prioridad y política);
  - historial desde `audit_logs` (entidad promoción), con usuario y hora de Lima.
- **Formulario:** vista previa con un producto real del alcance y validaciones en vivo por una API de preflight (sin persistir), que reutilice las reglas del servicio.
- **Permisos sin cambios:**
  - `promotions.manage` para ver y editar;
  - `pricing.discount.approve` para aprobar;
  - `promotions.export` para CSV.
  - Valida en el servidor.

## Interacción
- Filtros y chips con conteo en la URL.
- Fila seleccionada con `?id=` abre el `AdminDrawer` (unos 540 px).
- "Nueva promoción" o "Editar" abren un drawer ancho (unos 720 px). **Elimina el modal a pantalla completa actual.**
- Acciones por fila: Editar, Duplicar, Pausar/Activar, Archivar, con confirmación en las destructivas y bloqueo de doble clic.
- **Estados:**
  - vacío, con 2 plantillas;
  - skeleton con la misma geometría (`loading.tsx`);
  - error con reintento;
  - sin permiso de aprobar.
- **Mobile 390:** KPIs 2×2, "Vencen pronto", tarjetas, hoja de detalle a pantalla completa y CTA fijo.

## Entorno de validación
- **Servidor:**
  ```
  corepack pnpm exec dotenv -e .env.localdb -v CP_DEV_AUTH_BYPASS=true -v CP_DEV_AUTH_USER_ID=cp-dashboard-v5-user-gerencia -v CP_DEV_AUTH_ALLOWED_HOSTS=localhost:3003 -- next dev --port 3003 --webpack
  ```
  Navega **solo** a `http://localhost:3003`.
- **Datos de validación:** si faltan campañas o aplicaciones para ver los estados, crea una **fixture de desarrollo idempotente** `scripts/fixtures/promotions-dev.ts`, protegida contra producción (AGENTS.md "Visual data fixtures"). Marca los nombres como "[DEV]" y al final deja la base como estaba o documenta cómo limpiarla.
- **Playwright** (`scripts/qa/m10-promociones.mjs`):
  - capturas a 1920×1080 (lista, drawer de detalle, formulario) y 390×844, en `docs/goal/evidencia/m10/promociones/`;
  - comparación lado a lado con las láminas;
  - consola sin errores;
  - axe sin violaciones;
  - navegación por teclado del drawer (Esc cierra y el foco vuelve).
- **Recorrido funcional por UI:** crear una campaña con alcance → aparece en el calendario y en la cola → aprobar (con GERENCIA) → activar → pausar. Con SQL de verificación y auditoría.

## Prohibido
Tocar `.env.local` o `proxy.ts`, usar Neon, commit, rediseñar el shell (`AdminShell`) o cambiar reglas de precio o descuento del dominio.

## Terminado =
- Capturas reales equivalentes a las láminas, con las 9 correcciones.
- Recorrido funcional OK.
- `tsc`, lint 0/0, `test-all` (solo el Excel externo) y build.
- Informe breve con rutas de evidencia.
