# M10-05 — Implementar Mi cuenta: hub y navegación de cuenta (Codex)

Protocolo: `docs/goal/ORQUESTACION.md`. Meta: `docs/goal/META-10.md`.
**Diseño aprobado por Claude:** `docs/goal/designs/m10-lote3/` (hub desktop y mobile, pedidos, vacía) y `spec.md`. La lámina es la especificación; skill `product-design:image-to-code`. Estilo de **tienda**.

## Correcciones obligatorias
1. **Header, topbar y footer reales** de la tienda (en la lámina los iconos de la barra superior se superponen al texto; no copies eso).
2. **Estado vacío:** las tarjetas de "Primeros pasos" compactas, con alto según contenido y sin espacio vacío interno.
3. El bloque de **WhatsApp solo si hay número configurado** en Company Settings. No inventes número.
4. **Tipografía:** etiquetas ≥ 12 px, cuerpo ≥ 14 px. Botones de una sola línea.
5. **"Ir al panel administrativo"** solo si el rol es de personal (`isStaffRole`).
6. **"Cuenta verificada"** solo si Clerk indica correo verificado. Si no, no se muestra.
7. **Sin datos inventados:** todo sale de pedidos, cotizaciones, pagos, carrito, historial y cliente reales del usuario autenticado, **con aislamiento por cliente** (un cliente nunca ve datos de otro; valida en el servidor).

## Alcance
- `/cuenta` (hub):
  - la barra "Completa tus datos" aparece solo si falta RUC/DNI o dirección;
  - "Lo que requiere tu atención", con hasta 3 ítems reales priorizados: pago pendiente (con enlace a pagar o reintentar), cotización respondida, pedido en camino o listo para recoger;
  - "Pedido en curso" con el timeline de estados real;
  - cotizaciones y pedidos recientes (3 de cada uno);
  - "Volver a comprar" desde el historial, con "Agregar al carrito" o "Cotizar" según el precio publicado.
- **Navegación de cuenta común** (layout de `/cuenta/*`): Resumen, Pedidos, Cotizaciones, Pagos, Volver a comprar (historial), Mis datos y Cerrar sesión. Conteos y badges reales. En mobile, pestañas horizontales con scroll.
- `/cuenta/pedidos`, `/cuenta/cotizaciones`, `/cuenta/pagos` y `/cuenta/historial` dentro del layout, **sin romper** su funcionalidad actual (detalle `/cuenta/pedidos/[code]`, repetir pedido y pagar o reintentar).
- **Elimina** el hero de marketing actual de `/cuenta`.

## Entorno
Worktree y puerto que indique Claude en la orden. Bypass con un **usuario cliente** que tenga pedidos (o fixture de desarrollo idempotente protegida con host local, marcada [DEV], como en AGENTS.md). Prohibido: `.env.local`, `proxy.ts`, Neon y commit.

## Evidencia (`docs/goal/evidencia/m10/mi-cuenta/`)
- Capturas a 1920 y 390: hub con datos, hub vacío, pedidos, cotizaciones y pagos.
- Comparación con las láminas.
- axe y consola limpios.
- Prueba de aislamiento: el cliente A no ve los pedidos del cliente B, por UI y por API.
- `tsc`, lint 0/0, `test-all` y build. Informe. Sin commit.
