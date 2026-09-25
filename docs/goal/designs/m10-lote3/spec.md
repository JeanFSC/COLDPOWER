# M10 lote 3 · Mi cuenta

## Entrega

Esta entrega es exclusivamente una propuesta visual aislada. La lámina no modifica `src/`, la base de datos, `.env.local` ni `proxy.ts`, no levanta el runtime de Next.js y no crea una fixture operativa.

La referencia visual de la tienda es `docs/goal/designs/home-espejo/referencia.png`. El shell de tienda de las láminas reproduce la jerarquía de `TopBar`, `Header`, `TechnicalNav` y `Footer`: IBM Plex Sans/Mono, navy, azul técnico y CTA naranja/café.

| Lámina | Viewport CSS | Archivo |
| --- | ---: | --- |
| Hub de cuenta | 1920 × 1080 | `cuenta-hub-desktop-1920x1080.png` |
| Hub de cuenta mobile | 390 × 844 | `cuenta-hub-mobile-390x844.png` |
| Pedidos | 1920 × 1080 | `cuenta-pedidos-desktop-1920x1080.png` |
| Cliente nuevo / estado vacío | 1920 × 1080 | `cuenta-vacia-desktop-1920x1080.png` |

La fuente HTML parametrizada vive en `lamina/index.html`; la captura reproducible está en `lamina/capture.mjs`. Se usa Chromium headless con `deviceScaleFactor: 1`, `fullPage: false`, espera de `document.fonts.ready` y validación de `scrollWidth`.

## Decisión de diseño

El hub elimina el hero de marketing gigante que desplaza las tareas de cuenta. La prioridad visible pasa a ser:

1. saludo y datos faltantes para facturación;
2. acciones que requieren atención;
3. pedido en curso con timeline logístico;
4. cotizaciones y pedidos recientes;
5. volver a comprar.

En escritorio, la navegación persistente ocupa aproximadamente 250 px a la izquierda. En mobile se convierte en pestañas horizontales con scroll y las acciones de atención pasan antes que el seguimiento largo. Los CTA mantienen un tamaño accionable y la densidad se ajusta sin convertir las tarjetas en bloques estirados.

El estado vacío no muestra cuatro tarjetas de “No registrada”. Muestra tres rutas que sí ayudan a comenzar: búsqueda técnica, cotización y datos para facturación, además de ayuda por WhatsApp.

## Mapeo de datos reales

La lámina usa texto de muestra únicamente para hacer visible cada estado comercial solicitado en el brief. Códigos, montos, nombres, fechas y estados mostrados (`CP-COT-2026-048`, `PED-2026-044`, `S/ 871.00`, etc.) no son una inserción en la base ni una fuente alternativa. En la implementación real deben reemplazarse por los campos siguientes y ocultarse cuando la fuente no los entregue.

### Propietario y perfil

- Propietario: `requireUser()` entrega `userId` y `role`; el cliente no envía `customerId` para elegir qué datos ver.
- Consulta base: `getAccountOverview(userId, role)` en `src/lib/account-overview.ts` une `users` con `customers` por `customers.userId = users.id`.
- Nombre mostrado: `users.name`, con fallback a `customers.name`; saludo desde el primer nombre.
- Correo: `users.email`.
- Teléfono: `customers.phone`, con fallback a `users.phone`.
- Empresa: `customers.legalName`; si falta, solo se usa `customers.name` cuando `customerType` pertenece a los tipos empresariales reconocidos.
- Identificación para facturación: `customers.ruc` o `customers.documentNumber` desde `src/db/crm-schema.ts`. La consulta actual de overview no los proyecta todavía; el componente real debe incorporarlos en el contrato antes de usar el banner como completado.
- Dirección: dirección primaria de `customer_addresses` (`isPrimary`, luego `updatedAt`), con fallback a `customers.address` y `customers.location`.
- Estado “Completa tus datos”: se determina por ausencia de RUC/documento o dirección usable; no se infiere desde una cadena enviada por el navegador.
- Staff: `isStaffRole(role)` y el `adminHref` calculado por rol. El enlace al panel se mantiene secundario en la navegación.

### Pedidos, pagos y seguimiento

- Pedidos: `orders.code`, `status`, `total`, `currency`, `createdAt`, `updatedAt`, `deliveryMethod`, `deliveryAddress`, `deliveryDetails`, `paymentDueAt`, `customerNameSnapshot` y `customerPhoneSnapshot`.
- Propiedad de pedido: `orders.userId = userId` o `customers.userId = userId`, siempre en servidor.
- Estados públicos: `NEW/RECEIVED → Recibido`, `PAYMENT_PENDING → Pago pendiente`, `PAID → Pago confirmado`, `PREPARING → En preparación`, `READY/READY_FOR_PICKUP → Listo para recoger`, `IN_TRANSIT/SHIPPED → En camino`, `DELIVERED → Entregado`, `CANCELLED → Cancelado`.
- Timeline: `order_status_history` y `buildOrderTimeline(...)` determinan pasos hechos, actual y próximos. No se debe mostrar “llega hoy” si no existe `shipments.estimatedDeliveryAt` o una regla logística equivalente.
- Entrega: `deliveryMethod` (`PICKUP`, `DELIVERY`, `SHIPPING`) más `deliveryDetails` (`district`, `province`, `department`, `reference`, `agencyName`, `recipientName`).
- Envío: `shipments.carrier`, `trackingNumber`, `trackingUrl`, `status`, `estimatedDeliveryAt`; eventos desde `shipment_events` (`description`, `location`, `occurredAt`).
- Pagos: `payments.amount`, `currency`, `method`, `providerReference`, `status`, `updatedAt`; relación por `payments.orderId`.
- Estados públicos de pago: `PENDING → Pendiente`, `UNDER_REVIEW → En revisión`, `CONFIRMED/APPROVED → Confirmado`, `REJECTED → Rechazado`, `CANCELLED → Cancelado`, `REFUNDED → Reembolsado`, `ERROR → No procesado`.
- Acción “Pagar ahora” o “Reintentar pago”: solo si el pedido está en `PAYMENT_PENDING`, no venció `paymentDueAt`, y el backend autoriza la operación.

### Cotizaciones

- Fuente: `quotes` (`trackingCode`, `workflowStatus`, `createdAt`, `updatedAt`, `userId`) y `customer_quote_links` para la relación comercial.
- Propiedad: `quotes.userId = userId` o la cotización está enlazada al `customers` cuyo `userId` coincide.
- Historial: `quote_status_history` alimenta la actividad reciente y evita presentar una cotización como recién creada si ya tiene una transición posterior.
- Estados públicos: `borrador/draft`, `enviada/sent`, `evaluacion/in_review`, `requiere_info`, `cotizada`, `aprobada/accepted`, `convertida`, `cerrada/cerrado`, `nuevo`, `contactado`; los desconocidos se presentan como “En seguimiento”.
- La badge “1 respondida” de la lámina es un estado de ejemplo. En producción debe calcularse desde el estado operativo real y su última actualización.

### Carrito e historial

- Carrito de cotización: `quoteCarts.items`, filtrado por `userId` y `expiresAt > now`; el conteo suma cantidades válidas.
- Carrito de compra: `shopping_carts` y `shopping_cart_items` de `src/db/sales-schema.ts`; el precio se resuelve desde la fuente de precios al leer/confirmar, no desde un array de la lámina.
- Volver a comprar: la página actual usa `listPurchasedProductsForUser(userId)` y expone `productId`, `sku`, `name`, `slug`, `totalQuantity` y `lastOrderCode`. El CTA será “Agregar al carrito” solo cuando exista precio publicado; en caso contrario será “Cotizar”.

## Tokens y reglas visuales

- Fondo de trabajo: `#F4F7F9`.
- Navy de tienda: `#082A47`; navy de contenido: `#102F51`.
- Azul técnico: `#0B64D8` / azul secundario `#0B5F94`.
- CTA comercial: `#B45309`; barra superior: naranja brillante `#FF8A00`.
- Estados: éxito `#137A4B`, pendiente/atención `#B45309`, error `#B42318`.
- Tipografía: IBM Plex Sans para interfaz y IBM Plex Mono para códigos/SKU.
- Cuerpos y controles principales no bajan de 14 px en el flujo; códigos y micro-metadatos usan la variante mono de forma deliberada.
- La interfaz usa bordes finos, radios de 8–12 px y sombras suaves; no usa imágenes de producto falsas ni placeholders comerciales en estas láminas.

## Validación realizada

- Captura local por `file://`; no se levantó servidor de la aplicación.
- Playwright Chromium headless, DPR 1.
- Fuentes esperadas cargadas antes de capturar (`document.fonts.status = loaded`).
- Viewports verificados exactamente: 1920×1080 y 390×844.
- `scrollWidth` verificado igual al viewport en los cuatro casos.
- Interacción de filtros de pedidos implementada en la lámina: “Todos”, “En camino”, “Pago pendiente” y “Entregados” actualizan filas y `aria-pressed`.
- Foco visible, navegación semántica, links de cuenta, pestañas horizontales mobile y CTAs principales están representados en HTML accesible.

## Límites de la lámina

La lámina es una especificación visual interactiva, no una implementación de producción: los enlaces que no tienen una pantalla local muestran un aviso discreto y no escriben en el backend. La implementación final debe conservar el layout, pero conectar cada acción con las rutas/API existentes, estados vacíos/error/loading y permisos derivados de la sesión autenticada.
