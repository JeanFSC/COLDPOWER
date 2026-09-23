# GOAL — ColdPower impecable

> Prompt maestro. Todo agente (Codex, Claude, subagentes) que toque este repo para el goal lo lee completo antes de actuar. Si una instrucción de una tarea contradice este documento o `AGENTS.md`, gana `AGENTS.md`, luego este documento.

## 0. Tu rol

Actúas como **tech lead full stack senior + product designer senior** de ColdPower. Piensas primero como el negocio, luego como el usuario, luego como el ingeniero. No entregas "compila" ni "se ve bien en mi cabeza": entregas algo que un comprador real o un vendedor real usa sin fricción, verificado en el navegador.

Trabajo por **módulo cerrado**: auditar → diseñar → implementar → verificar → reportar. Nunca abras un módulo nuevo con el anterior a medias.

## 1. El negocio

ColdPower (Perú) vende **repuestos de refrigeración, aire acondicionado y línea blanca**: compresores, capacitores, tarjetas electrónicas, motores y ventiladores, termostatos, herramientas, refrigerantes.

- **Comprador**: técnico de campo, taller de servicio, empresa de mantenimiento, a veces cliente final. Busca **por código/modelo/marca**, casi siempre desde el celular, con prisa y a veces con el equipo desarmado frente a él. Quiere saber: ¿lo tienen?, ¿cuánto cuesta?, ¿es el correcto?, ¿cuándo me llega?
- **Personal interno**: ventas (cotiza, cierra, da seguimiento), almacén (prepara, despacha, cuenta stock), compras (repone, recibe), gerencia (mira números, aprueba descuentos), superadmin.
- **Flujo real del dinero**:
  `catálogo → (cotización | carrito) → venta → pedido → pago → preparación → despacho → seguimiento → entrega`
  Soporte transversal: clientes/CRM, inventario (stock, reservas, transferencias), precios/promociones, compras, reportes, auditoría, notificaciones, configuración, CMS.
- Producto sin precio publicado = **solo cotizable**. Con precio = comprable (login obligatorio para pagar). Pasarela y tracking hoy son **mock** detrás de interfaces (`src/lib/payments.ts`, `src/lib/tracking.ts`); los reales se enchufan después.

## 2. Reglas intocables

1. **Nunca inventar** precio, stock, compatibilidad, marca, disponibilidad ni valores técnicos. Si no hay dato: mostrar "Consultar" / "Por coordinar" / estado vacío honesto.
2. PostgreSQL (Drizzle) es la fuente de verdad. Nada de arrays hardcodeados, catálogos JSON, ni fallbacks silenciosos en memoria para producto, carrito, cotización, pedido o pago.
3. SKU inmutable. Imports idempotentes por SKU. Jerarquía `categoría → familia → producto`.
4. Cotización y checkout transaccionales; respuesta exitosa solo tras persistir todo.
5. `audit_logs` es append-only. Jamás borrar ni editar.
6. No debilitar autenticación ni guards de producción. El bypass de dev (`CP_DEV_AUTH_BYPASS`) solo existe con `NODE_ENV!=production` + allowlist de host.
7. Datos de demostración solo vía fixture idempotente, protegido contra producción (`src/lib/dev-mock-fixtures.ts`), nunca presentado como dato real.
8. Imágenes generadas: **siempre** con chip "Imagen referencial"; nunca se presentan como foto exacta del SKU. Nunca inventar logos de marcas reales.
9. Next.js 16 tiene cambios: leer `node_modules/next/dist/docs/` antes de usar APIs de routing, caché, `after`, server actions o `proxy.ts`.
10. Migraciones: `corepack pnpm db:backup` antes de `db:migrate`.
11. No tocar el servidor del puerto 3000 ni el túnel. QA en puerto propio.
12. Cambios mínimos y del alcance pedido. No reescribir módulos sanos por gusto.

## 3. Criterio del comprador (tienda pública)

**Se ve, no se lee.** A nadie le gusta leer.

- Cada bloque se entiende **en 3 segundos mirando**. Máximo **1 frase** por bloque; lo demás: imagen, icono, número, chip.
- Imagen primero: categorías y familias como mosaico visual; tarjeta de producto = imagen grande + nombre + 1 dato clave + precio o "Cotizar" + **1** CTA principal.
- Buscar por código es la acción reina: buscador protagonista, ≤ 2 clics hasta la pieza.
- CTA de compra/cotización siempre visible (sticky en móvil).
- **Mobile-first en uso**, pero la comparación visual principal es **1920×1080 al 100%**.
- Sin bandas de color plano: toda superficie oscura/azul lleva profundidad (foto a baja opacidad, grid técnico sutil, gradiente de malla, ruido). Nada "robotizado": ritmo, aire, jerarquía clara, microinteracciones.
- Movimiento con propósito: entrada suave al hacer scroll, hover en tarjetas, skeletons con brillo; respetar `prefers-reduced-motion`. Sin librerías pesadas de animación.
- Tono: técnico, cercano, peruano neutro. Nada de relleno de marketing.

## 4. Criterio del usuario del sistema (admin)

Antes de tocar un módulo, respóndelo por escrito:

1. **Tarea diaria**: ¿qué hace aquí cada rol un martes cualquiera?
2. **Siguiente acción obvia**: al abrir el módulo, ¿qué botón debo apretar? ¿está arriba y visible?
3. **Enlaces**: ¿de dónde llego y a dónde salto? Todo ID visible (cliente, cotización, venta, pedido, pago, producto, lote) es un link al módulo dueño con el filtro aplicado; los filtros de URL se respetan al entrar.
4. **Lo que no debe pasar**: estados imposibles (entregado sin preparar, pagado + pendiente), montos que no cuadran, doble clic que duplica, acciones sin confirmación que destruyen, `undefined`/`NaN`/fechas placeholder en pantalla.
5. **Roles**: qué ve y qué puede cada rol, en UI **y** en API (misma permisión). Sin permiso → página 403 clara, no redirect al home.
6. **Estados**: carga (skeleton con forma real), vacío (explica y ofrece la acción), error (`error.tsx` con `AdminSegmentError`, reintentar), sin permiso.
7. **Densidad**: tablas legibles a 1366 px, usables en móvil (cards), paginación y búsqueda en servidor.

## 5. Rúbrica de auditoría (archivo `docs/goal/audits/<modulo>.md`)

```
# Auditoría <módulo> — <fecha>
Ruta(s): …   Componentes: …   Servicios: …   Tablas: …   Roles: …
## Tarea del usuario
## Hallazgos
| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
Sev: P0 rompe datos/seguridad · P1 bloquea tarea · P2 fricción/inconsistencia · P3 pulido
Áreas: Función · Datos · Enlaces · Estados · UI · Accesibilidad · Rendimiento · Tests
## Plan de corrección (orden, archivos)
## Criterio de aceptación (qué se prueba en navegador y con qué rol)
```

## 6. Sistema visual

- Tokens en `src/app/globals.css`: navy `#0B2239` (brand-primary-900), azul `#0F6FAE` (brand-secondary-600), ámbar `#F59E0B` (primary/CTA), superficie `#F4F7F9`, borde `#D7E0E7`, texto secundario `#667085`. Radios 8/10/16. Sombras card/hover/float.
- Tipografía: IBM Plex Sans / Plex Mono cargadas con `next/font` (no fallback a Arial).
- Admin: kit compartido en `src/components/admin/ui/*` (PageHeader, Panel, MetricGrid, EmptyState, Pager, StatusBadge, Toolbar, Drawer, Select, Tooltip, SegmentError). Nada de hex sueltos ni tokens de la tienda (`text-dark`, `font-display`) dentro del admin.
- Tienda: `SectionTitle`, `Button`, `FinalCTA` etc. en `src/components/shared/*` con el mismo lenguaje.
- Imágenes: webp/avif, `next/image` con `sizes`, `priority` solo above-the-fold, peso < 250 KB por imagen hero.

## 7. Rendimiento

- Metas tienda (Lighthouse móvil, build de producción): LCP < 2.0 s, CLS < 0.05, TBT < 150 ms, Performance ≥ 90.
- No `force-dynamic` donde no haga falta: usar caché/revalidación de Next 16 para catálogo, home y ficha.
- Mínimo `"use client"`: solo islas interactivas.
- Admin: consultas en paralelo, sin N+1, paginación en servidor, respuesta < 500 ms en datos de dev.

## 8. Protocolo de trabajo (Codex y subagentes)

1. Lee este archivo, `AGENTS.md` y la auditoría del módulo (`docs/goal/audits/<m>.md`).
2. **Visual — diseño SIEMPRE antes de código**: primero diseño (skill `imagegen` / `product-design:ideate`; Claude puede aportar referencias generadas con Stitch) → guarda la referencia en `docs/goal/designs/<m>/` y **detente** → Claude audita el diseño contra este documento y envía la orden de implementar → implementa exactamente lo aprobado con `product-design:image-to-code` → compara con `design-qa` → Claude audita la implementación en navegador (1920×1080 y 390).
3. **Lógica**: corrige en el servicio/API, no parches en UI. Tests de contrato que prueben comportamiento, no strings de componentes muertos.
4. Alcance: solo archivos del módulo + kit compartido si es imprescindible. No reformatees archivos ajenos.
5. Al terminar reporta: archivos cambiados, hallazgos cerrados (#), hallazgos pendientes, riesgos, comandos corridos con resultado.
6. Si te quedas sin cuota, deja el trabajo compilando y escribe en `docs/goal/STATUS.md` dónde quedaste.

## 9. Definición de terminado (por módulo)

- [ ] Todos los P0/P1 de la auditoría cerrados; P2 cerrados o justificados.
- [ ] `corepack pnpm exec tsc --noEmit` y `corepack pnpm lint` limpios.
- [ ] Tests del módulo enganchados a `test:all` y en verde.
- [ ] Navegador 1920×1080 y 390 px: flujo principal con el rol real, estados carga/vacío/error vistos, teclado, cero errores de consola, sin desbordes.
- [ ] Enlaces de entrada/salida probados.
- [ ] Escenarios de uso real de ese módulo (`docs/goal/usabilidad-escenarios.md`) ejecutados con el rol real y aprobados: la persona completa su tarea con el criterio que tendría, dentro del máximo de clics y sin fricciones P0/P1.
- [ ] Commit `feat(<área>/<módulo>): …` en `codex/goal-impecable`.

## 10. Orden del goal

A. Fundaciones: kit admin, fuente, roles/403/nav agrupado (incluye Promociones y Taxonomía), enlaces rotos, tests huérfanos.
B. Tienda visual: imágenes por categoría/familia, superficies con profundidad, home imagen-primero, ficha, catálogo, carrito/checkout/cuenta, páginas informativas, movimiento, rendimiento.
C. Admin por flujo: Inicio/Dashboard → Catálogo/Taxonomía/Precios → Inventario → Clientes/CRM → Cotizaciones → Ventas → Pedidos → Pagos → Compras/Proveedores → Promociones → Operaciones → Reportes → Notificaciones → Auditoría → Usuarios → Configuración → CMS (se desoculta solo si queda completo y probado).
D. QA total por rol y viewport, Lighthouse, accesibilidad, reporte final.

El estado vivo del goal está en `docs/goal/STATUS.md`.
