# Bloque comercial — especificación visual Parte B

Estado: **diseño primero**. Este documento y las ocho láminas son el handoff visual para Cotizaciones → Ventas → Pedidos → Pagos. No implementa rutas, componentes ni datos nuevos en la aplicación.

## 1. Fuente visual y límites

La dirección se deriva del admin existente, especialmente `AdminShell`, `AdminDrawer`, los cuatro control centers comerciales y los tokens de `src/app/globals.css`:

- fondo de página claro `#f8fafc`;
- navegación activa navy `#102f51`;
- acción primaria `blue-600` / `#2563eb`;
- superficies blancas, bordes `slate-200` y texto `slate-900` / `slate-600`;
- `IBM Plex Sans` para interfaz y `IBM Plex Mono` para IDs, SKU y referencias técnicas;
- estados: emerald para confirmado/listo, amber para pendiente/atención, rose para error/anulación y violet para picking o flujo en proceso.

La composición desktop conserva el shell administrativo actual: sidebar de aproximadamente 190–198 px, topbar de 76 px, contenido con gutter de 36 px y drawers de aproximadamente 520–560 px. En 390 px se oculta la sidebar, se conserva un topbar compacto y el drawer se transforma en un bottom sheet de ancho completo.

Los nombres, montos y códigos mostrados en las imágenes son datos de composición para hacer legibles los estados. No son fixtures operativos ni deben copiarse como datos de producción. La futura implementación debe resolverlos desde PostgreSQL y respetar permisos, estados y deep-links de la Parte A.

## 2. Entregables

| Módulo | Desktop | Mobile |
| --- | --- | --- |
| Cotizaciones | [cotizaciones-desktop-1920x1080.png](./cotizaciones-desktop-1920x1080.png) | [cotizaciones-mobile-390x844.png](./cotizaciones-mobile-390x844.png) |
| Ventas | [ventas-desktop-1920x1080.png](./ventas-desktop-1920x1080.png) | [ventas-mobile-390x844.png](./ventas-mobile-390x844.png) |
| Pedidos | [pedidos-desktop-1920x1080.png](./pedidos-desktop-1920x1080.png) | [pedidos-mobile-390x844.png](./pedidos-mobile-390x844.png) |
| Pagos | [pagos-desktop-1920x1080.png](./pagos-desktop-1920x1080.png) | [pagos-mobile-390x844.png](./pagos-mobile-390x844.png) |

Desktop es exactamente 1920×1080. Mobile es exactamente 390×844: 390 px de ancho es el contrato responsive; la altura representa el primer viewport con contenido desplazable.

## 3. Reglas compartidas

### Densidad y jerarquía

- El encabezado de cada módulo tiene título, explicación de una línea y una acción primaria cuando corresponda.
- KPIs y filtros son compactos; la tabla conserva lectura horizontal en desktop y se convierte en tarjetas accionables en mobile.
- Los drawers no reemplazan el contexto: en desktop dejan visible la lista o cola; en mobile se presentan como bottom sheet y el contexto queda atenuado.
- Cada panel debe medir lo que necesita su contenido. No usar `flex: 1` ni una altura artificial para estirar un bloque junto a otro.
- Las acciones peligrosas se separan visualmente de las acciones de consulta y requieren motivo/confirmación.
- Los IDs son enlaces al módulo dueño: `Q-*` a Cotizaciones, `V-*` a Ventas, `O-*` a Pedidos y `PAGO-*` a Pagos.

### Moneda y periodo

- El formatter monetario se ejecuta una sola vez. El valor visible debe ser `S/ 18,420.00` para PEN, no una concatenación que produzca `PEN PEN S/` o repita `PEN S/`.
- Si se necesita identificar la moneda, se muestra como metadata separada (`PEN · neto`) o como columna independiente; nunca se antepone el ISO a una cadena ya localizada.
- El KPI de pagos usa la nota `Últimos 14 días · período cerrado`/la variante equivalente que entregue el backend. No mezclar “hoy”, “últimos 7 días” o una etiqueta que no corresponda a la serie realmente consultada.

### Estados de datos

Todos los módulos deben prever estos estados antes de implementar:

| Estado | Tratamiento visual |
| --- | --- |
| Cargando | skeleton breve en tabla/drawer, sin saltos de layout |
| Vacío | mensaje honesto dentro del panel, con altura compacta y acción contextual si existe |
| Error | alerta inline con reintento; no presentar datos parciales como confirmados |
| Conflicto de versión/estado | bloque de advertencia y recarga del registro; nunca ocultar el rechazo del servidor |
| Sin permiso | acción ausente o deshabilitada con explicación, según el contrato del módulo |

## 4. Cotizaciones

### Lista

La tabla prioriza código, cliente, monto, estado, vigencia y última actualización. Incluye búsqueda y filtros por estado, cliente, moneda y vigencia. La fila seleccionada abre el drawer sin perder la lista.

Estados visibles: `Borrador`, `Enviada`, `Por aprobar`, `Aceptada`, `Nueva versión` y `Vencida`. La etiqueta debe distinguir una nueva versión de una modificación silenciosa.

### Drawer y acciones

El drawer muestra cliente, total congelado, estado, relaciones y una línea de tiempo. La acción rail se ordena así:

1. `Enviar` — persiste el snapshot de precios antes de comunicar.
2. `Registrar respuesta` — guarda resultado y fecha de contacto.
3. `Agendar seguimiento` — crea el seguimiento con responsable y fecha.
4. `Nueva versión` — conserva la versión anterior y abre el editor de la siguiente.
5. `Aprobar descuento` — visible sólo con el permiso correspondiente y cuando existe una solicitud.

La aprobación de descuento debe mostrar precio de lista, descuento propuesto, precio final, margen/regla aplicable y quién aprobó. Aprobar o rechazar requiere una respuesta del servidor y una confirmación visible.

### Modal de conversión

El modal no es un formulario genérico: es una revisión previa a convertir. Debe incluir:

- líneas con SKU, nombre, cantidad, precio unitario congelado y subtotal;
- impuestos y total final, con una única representación monetaria;
- método de entrega, al menos `Despacho a domicilio` y `Recojo` cuando el dominio los permita;
- confirmación de conversión sólo después de validar servidor/transacción;
- resultado con links `Ver venta` y `Ver pedido`, usando los IDs creados.

En mobile, la conversión vive dentro del bottom sheet como panel anidado y mantiene una acción final visible sin tapar el total.

## 5. Ventas

### Lista

La tabla muestra código, cliente, monto, conciliación de cobro, estado, canal y fecha. El filtro de conciliación distingue `Sin pago`, `Pendiente`, `Conciliado`, `Observado` y `Sobrepago`; no debe confundirse con el estado de la venta.

### Drawer y anulación

El drawer contiene:

- resumen de cliente, total y estado;
- links a cotización, pedido y pago relacionados;
- timeline de venta registrada, pedido creado y cobro conciliado;
- bloque final `Anular venta`, separado del resto, con motivo obligatorio y confirmación.

La anulación usa la operación de dominio existente (`sales.cancel`/`changeOrderStatus` según el flujo), respeta la versión esperada y comunica cualquier bloqueo por pago `CONFIRMED`/`APPROVED`. La pantalla no debe prometer una anulación si el servidor la rechaza.

En mobile, el motivo se mantiene en un control de ancho completo y la acción destructiva queda debajo de las relaciones, nunca mezclada con los links.

## 6. Pedidos

### Cola de preparación

La parte superior es operacional, no un KPI financiero. Las colas son:

- `Por preparar`;
- `En picking`;
- `Listos para despacho`;
- `Incidencias`.

Cada pedido expone código, cliente, avance `picked/total`, total, estado logístico, modalidad de entrega y atención. Los contadores de cola deben provenir de la consulta real y enlazar al filtro correspondiente.

### Drawer de fulfillment

El drawer usa pestañas compactas: `Resumen`, `Productos`, `Preparación`, `Entrega` e `Historial` (y `Pago` sólo para roles que puedan verlo). La pestaña Preparación incluye:

- picking por línea, con cantidad preparada y total requerido;
- ubicación y disponibilidad de la reserva real;
- identificador de reserva, estado y unidades comprometidas;
- incidencia por faltante o bloqueo, si aplica.

La sección Entrega muestra modalidad, dirección/recojo y un stepper `Preparando → Despachado → Entregado`. `Avanzar seguimiento` sólo aparece para una transición válida. Almacén puede preparar y consultar fulfillment sin necesidad de ver datos de pago.

En mobile, la reserva real debe quedar cerca del picking, no escondida en una pestaña financiera. El stepper se vuelve una línea compacta y el CTA queda después de la última evidencia disponible.

## 7. Pagos

### KPIs y resumen

La primera fila muestra `Monto confirmado`, `Órdenes conciliadas`, `Pendientes`, `Observados` y `Tasa de conciliación`. El KPI monetario usa una sola cadena `S/ ...`; la moneda puede aparecer como metadata separada.

`Estado de pago` y `Métodos de pago` son tarjetas hermanas de altura automática. El donut y su leyenda se mantienen en un bloque compacto de aproximadamente 170 px; si no hay datos, se usa un empty state breve. El layout no debe estirar Estado de pago hasta dejar un área blanca desproporcionada.

### Cola `Por reembolsar`

La cola tiene tabs/chips `Todos`, `Pendientes`, `Con diferencia` y `Por reembolsar`. Al seleccionar `Por reembolsar`, las filas deben mostrar pago, pedido, cliente, monto, estado y última actualización. La etiqueta significa que existe una obligación de devolución pendiente, no que el pago ya fue reembolsado.

### Drawer de pago

El drawer muestra el pago, pedido, monto y estado. El historial se lee siempre en español con dirección explícita `from → to`, por ejemplo:

```text
Pendiente → En revisión
En revisión → Confirmado
Confirmado → Por reembolsar
```

Incluye dos zonas de acción claramente separadas:

- `Devolución manual`: abre el flujo de devolución, con monto, motivo, evidencia/nota y confirmación idempotente.
- `Pago manual`: permite editar el `Monto`, elegir moneda y método y registrar el pago; el valor editable debe estar validado por servidor y no ser sólo texto decorativo.

El drawer debe comunicar permisos y resultados: éxito, rechazo de transición, error del proveedor y conflicto de versión. Nunca mostrar un pago manual como confirmado antes de persistirlo.

En mobile, KPIs se reducen a tarjetas compactas, `Por reembolsar` queda visible como cola prioritaria y el drawer conserva la historia y ambos flujos sin una tarjeta de Estado de pago estirada.

## 8. Accesibilidad y responsive

- Drawer con `role="dialog"`, nombre accesible, foco inicial en cerrar, foco atrapado y cierre con `Escape`.
- Todas las acciones táctiles deben tener al menos 44×44 px; los botones visualmente compactos pueden ampliar su área hitbox.
- Estados no dependen sólo del color: texto y/o icono acompañan cada badge.
- Tablas desktop tienen encabezados semánticos y las tarjetas mobile conservan el mismo orden de lectura.
- Los modales de conversión y confirmación deben anunciar error/éxito inline y devolver el foco al registro que los abrió.
- A 390 px no hay scroll horizontal; los montos, códigos y acciones no se cortan.

## 9. Gate antes de implementar

Estas láminas no autorizan todavía cambios en `src/components/admin/*`. Antes de implementar la Parte B, Claude debe aprobar la dirección para Q7, Q8, Q13, G6, G7, G8, V10, O12 y G10. La siguiente fase deberá:

1. traducir este handoff a los componentes vivos y datos reales;
2. validar desktop en 1920×1080 y mobile en 390 px, incluyendo loading/empty/error/conflict;
3. verificar teclado, permisos, deep-links, moneda y ausencia de paneles estirados;
4. ejecutar la batería de pruebas y la revisión visual correspondiente.

La única modificación de código de esta entrega es el texto UTF-8 corregido en `src/lib/payment-service.ts`.
