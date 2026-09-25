# Diseño M10 lote 3 — Mi cuenta (hub y navegación de cuenta) · prompt de Claude para Codex

Solo diseño: no toques `src/`, la base, `.env.local` ni `proxy.ts`, y no levantes servidores de la app (los puertos 3003 y 3006 están ocupados). Sin commit.

**Método aprobado:** lámina HTML con los tokens reales de la **tienda** (`src/app/globals.css`, las mismas fuentes y el header/footer reales de la tienda) y captura con Playwright (chromium headless, DPR 1). Instala Playwright dentro de `docs/goal/designs/m10-lote3/lamina/` si hace falta.

**Estilo:** la de **la tienda**, no la del admin: navy `#102f51`, azul de marca y CTA café o naranja de la tienda, como en `docs/goal/designs/home-espejo/referencia.png`. El header y el footer son los reales de la tienda.

**Entregables** en `docs/goal/designs/m10-lote3/`:
- `cuenta-hub-desktop-1920x1080.png` y `cuenta-hub-mobile-390x844.png`;
- `cuenta-pedidos-desktop-1920x1080.png` (lista con la navegación de cuenta);
- `cuenta-vacia-desktop-1920x1080.png` (cliente nuevo sin pedidos ni cotizaciones);
- `spec.md` con el mapeo de datos reales.

## Quién y para qué
- **Cliente B2B o B2C:** técnico, taller, empresa. **Preguntas al entrar:** ¿dónde está mi pedido y cuándo llega? ¿Me respondieron la cotización? ¿Tengo algo por pagar? Repetir una compra frecuente. Completar mis datos para facturar (RUC o dirección).
- **Hoy:** un hero de marketing gigante ("MI CUENTA" y la foto de un aire acondicionado) empuja todo lo útil bajo el pliegue, y las subpáginas (`/cuenta/pedidos`, `/cuenta/cotizaciones`, `/cuenta/pagos`, `/cuenta/historial`, `/cuenta/carrito`) no tienen navegación común.

## Datos reales (lee `src/app/cuenta/**`, `src/lib/*account*`, `src/db/sales-schema.ts` y `src/db/crm-schema.ts`)
- **Perfil:** nombre, correo (Clerk), teléfono, y el cliente comercial asociado (`customers`: tipo, RUC o DNI, dirección y departamento / provincia / distrito).
- **Pedidos** (`orders`): código, estado logístico, total, fecha, tipo de entrega y seguimiento o timeline.
- **Cotizaciones** (`quotes`): código, estado (enviada, respondida, aceptada, vencida), vigencia e importe.
- **Pagos** (`payments`): pendientes con enlace para pagar y reintentar.
- **Carrito persistente e historial** (productos comprados antes) para "Volver a comprar".

## Composición desktop (1920×1080)
- **Header y footer reales de la tienda.** Migas "Inicio › Mi cuenta".
- **Layout de 2 columnas:**
  - **navegación de cuenta a la izquierda** (unos 260 px, fija): avatar e iniciales, nombre y correo; ítems Resumen · Pedidos (con conteo activo) · Cotizaciones (con badge "1 respondida") · Pagos (badge si hay pendiente) · Volver a comprar · Mis datos; y "Cerrar sesión";
  - **contenido a la derecha.**
- **Resumen (hub)**, todo sobre el pliegue:
  1. **Saludo compacto** en una línea ("Hola, Jean") y, **si falta**, una barra de "Completa tus datos para facturar" (RUC o dirección) con CTA.
  2. **"Lo que requiere tu atención"**, hasta 3 tarjetas de acción: "Cotización CP-COT-2026-048 respondida · Ver y aceptar", "Pago pendiente PED-2026-044 · Pagar ahora S/ 871.00" y "Pedido en camino · llega hoy".
  3. **"Pedido en curso"**: tarjeta ancha con el timeline de estados (Recibido → Pagado → Preparando → Listo / En camino → Entregado), el paso actual resaltado, la entrega (agencia o recojo) y "Ver detalle".
  4. **Dos columnas:** "Cotizaciones recientes" (3 filas con estado y vigencia) y "Pedidos recientes" (3 filas con estado y total).
  5. **"Volver a comprar"**: carrusel compacto de productos comprados antes, con "Agregar al carrito" o "Cotizar" según el precio publicado.
- **Staff:** si el usuario es personal, el enlace "Ir al panel administrativo" queda discreto en la navegación, no como botón principal.

## Subpágina Pedidos
Misma navegación de cuenta. Filtros por estado, lista de tarjetas o tabla (código, fecha, productos, total, estado y entrega) y la acción "Repetir pedido".

## Estado vacío (cliente nuevo)
En vez de 4 cajas "No registrada", un bloque de bienvenida con 3 pasos útiles: "Busca por código o modelo", "Pide una cotización" y "Completa tus datos para facturar", más ayuda por WhatsApp si está configurado.

## Mobile 390×844
- La navegación de cuenta pasa a pestañas horizontales con scroll.
- "Lo que requiere tu atención" arriba.
- CTAs al alcance del pulgar.

## Reglas de calidad
- Nada genérico ni vacío.
- Sin tarjetas estiradas.
- Etiquetas ≥ 12 px y cuerpo ≥ 14 px.
- Español del Perú, con tildes y "¿".
- Montos `S/ 1,240.00` y fechas `25 set 2026`.
- Sin datos inventados (sin calificaciones ni puntos de fidelidad que no existan).
