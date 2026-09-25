# M10-02 — Admin: correcciones globales y puntuales hasta ≥ 9,5 (Codex)

Protocolo: `docs/goal/ORQUESTACION.md`. Meta y rúbrica: `docs/goal/META-10.md` (§1, §3 y §4b). Lenguaje del admin: §3 (slate, `blue-600` primario, tarjetas `rounded-xl border-slate-200/90 shadow-2xs`).

**No rediseñes módulos completos:** cambia solo lo listado. Taxonomía, detalle de producto, proveedor y configuración tienen rediseño aparte; **no los toques**.

## Entorno
```
corepack pnpm exec dotenv -e .env.localdb -v CP_DEV_AUTH_BYPASS=true -v CP_DEV_AUTH_USER_ID=user_3HsX8RHS2xwA0sPrSpXAe5SdDOO -v CP_DEV_AUTH_ALLOWED_HOSTS=localhost:3003 -- next dev --port 3003 --webpack
```
- Siempre `http://localhost:3003` (SUPERADMIN). Para validar permisos, reinicia con `cp-dashboard-v5-user-almacen`, `-staff-001` (VENTAS) y `-gerencia`.
- Playwright desde `node_modules` o `.qa-runtime`, headless. SQL con `C:\PostgreSQL\18\bin\psql.exe -h 127.0.0.1 -p 5433`.
- **Prohibido:** `.env.local`, `proxy.ts`, Neon y commit. El puerto 3005 es de Claude: no lo toques.

## A. Globales
1. **`src/components/admin/AdminShell.tsx`:** el bloque "¿Necesitas ayuda?" y el pie de empresa **no deben tapar** ítems del menú a 1920×1080 ni a 1366×768.
   - Solución esperada: que formen parte del flujo del sidebar (al final de la lista con scroll) o que se contraigan a un botón de icono cuando falta altura.
   - Verifica que Auditoría, Usuarios y Configuración queden visibles y clicables.
2. **CTA primario del admin siempre `blue-600`.** Hoy son naranjas en Catálogo ("Nuevo producto", "Publicar cambios"), Clientes ("Nuevo cliente") e Inventario ("Ajustar inventario"). Busca en `src/components/admin/**` los botones primarios naranjas o de `action-accent` y unifícalos. Los chips de estado conservan su color semántico.
3. **Anillo de foco del admin:** `focus-visible` azul (`ring-blue-600/40`), nunca naranja. Ejemplo: el botón cerrar del drawer de Ventas.
4. **Deltas "vs. período anterior":** centraliza en `src/lib/period-metrics.ts` (`deltaPct`):
   - si `previous` < 5 o es 0: devuelve un estado **"Nuevo"** (base 0) o **"Sin base comparable"**, **nunca** porcentajes de más de 3 cifras;
   - limita la visualización a ±999% y más allá muestra "×10" o similar;
   - aplícalo en Dashboard, Operaciones, Auditoría, Notificaciones, Reportes, Catálogo y Promociones (grep "período anterior").
   - Prueba unitaria con los casos 0→5, 1→140, 100→143 y 3→3.
5. **Ancho de contenido uniforme:** Cotizaciones usa un contenedor más angosto que el resto. Iguala su gutter y ancho máximo a Pedidos y Pagos.
6. **Cero textos internos visibles:** ningún enum (`CONFIRMED`, `PAYMENT_APPROVED`, `INVENTORY_CRITICAL`…) ni nombre de proveedor técnico (`mock`) como texto para el usuario. Mapea a etiquetas en español, con un diccionario central si no existe.

## B. Por módulo
- **Inicio (`/admin/inicio`):**
  - KPIs sin media tarjeta vacía: agrega contexto real (por ejemplo "Mis tareas hoy 9 · 3 vencen hoy") o compacta la altura;
  - "Actividad del equipo" con texto informativo real desde auditoría (quién hizo qué sobre qué: "María Torres confirmó el pago PAGO-048"), no "actualización registrada";
  - "Resumen operativo de hoy" sin hueco inferior;
  - "Módulos frecuentes" sin "Abrir módulo" repetido: muestra un dato vivo por módulo (por ejemplo "Cotizaciones · 12 por responder").
- **Cotizaciones:**
  - el código de cotización en una sola línea (mono, sin partir);
  - la fecha de vigencia en una sola línea;
  - altura de fila compacta como en Pedidos;
  - la columna Importe muestra monto o "Por cotizar" sin la segunda línea "Moneda pendiente".
- **Ventas:**
  - "Ticket promedio" en una tarjeta compacta (o integrada como KPI), sin tarjeta alta de un solo dato;
  - el panel "Ventas por método" no se corta;
  - la página **no abre el drawer por defecto** salvo `?id=` en la URL.
- **Pagos:**
  - agrupa los métodos por etiqueta final (hoy "Transferencia" aparece dos veces por códigos distintos);
  - "mock" se muestra como "Pasarela de prueba" o se excluye si el monto es 0;
  - la tarjeta del donut sin hueco (leyenda al lado o altura ajustada).
- **Notificaciones:**
  - cuerpo de los mensajes en español humano, en `src/lib/payment-service.ts:320-323` y el resto de `notifyStaff*`: "El pago PAGO-048 del pedido PED-2026-048 fue aprobado por la pasarela", sin "mock" ni "CONFIRMED";
  - códigos de regla como texto secundario o tooltip;
  - el panel central de detalle vacío pasa a estado compacto o se oculta sin selección.
- **Clientes:** elimina la duplicación de los 4 KPIs en "Resumen de clientes". Reemplázala por información nueva (por ejemplo "Sin actividad 90 días", "Con cotización abierta", "Top 5 por venta 30 días") o quita el bloque.
- **Precios:**
  - quita las etiquetas repetidas dentro de celdas ("PEN / USD", "POR VOLUMEN", "PISO COMERCIAL", "VIGENCIA");
  - la columna "Actualizado" no se corta (tabla con ancho correcto o columna fija);
  - KPIs compactos.
- **Auditoría:**
  - los eventos con fecha futura vienen de una fixture visual (`cp-visual-year-2026-*`, 26 dic 2026). Corrige la fixture para que **no genere fechas futuras** y limpia esas filas **solo en la base local**, con un script idempotente protegido (host local obligatorio);
  - el panel de detalle sin selección, compacto.
- **Usuarios:**
  - KPI duplicado ("Usuarios activos" = "Usuarios registrados"): reemplázalo por "Sin acceso 30 días" o "Por rol";
  - "Último acceso": si no hay dato persistido, muestra "—" y no "Nunca registrado" en todos. Investiga si se puede registrar desde el login y documéntalo; no lo implementes si requiere Clerk webhooks nuevos;
  - un solo botón Exportar.
- **Compras:** en "Rendimiento por proveedor", el texto encimado ("LG Electronics · PENS/ 970") pasa a columnas separadas (proveedor | moneda | monto | barra | %).
- **Inventario:** el panel "Movimientos recientes" no corta texto (truncado con tooltip y ancho controlado).
- **Catálogo:** CTAs azules (punto A2); la columna Checklist, compacta (icono ✓ / ⚠ con tooltip o conteo "4/5").

## Verificación
- Capturas antes y después a 1920×1080 de **cada módulo tocado**, en `docs/goal/evidencia/m10/admin-pulido/`.
- Consola sin errores. axe sin violaciones en los módulos tocados. Recorrido rápido por UI de una acción por módulo (sin romper nada).
- `tsc`, lint 0/0, `test-all` (solo el Excel externo) y build.
- Informe por punto (A1…B-Catálogo). Sin commit.
