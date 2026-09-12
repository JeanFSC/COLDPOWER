# Auditoría visual, accesible y lógica — Tanda 2

Fecha: 2026-09-06  
Módulos revisados: Pedidos, Clientes, Ventas y Pagos  
Entorno: `dev.coldpower.pe`, sesión autenticada del usuario en Brave

## Resultado ejecutivo

La tanda está implementada y conserva una estructura visual consistente: navegación administrativa, encabezado, KPIs, filtros, tabla, panel operativo y panel de detalle. La accesibilidad semántica básica también está presente: encabezados, tablas, filas/celdas, botones etiquetados, enlaces, pestañas y campos con nombre.

Sin embargo, no la considero cerrada para aprobación visual/lógica porque hay desviaciones materiales frente a las imágenes de referencia y varias inconsistencias de confianza operativa:

- Pedidos muestra estados incompatibles en casos visibles: `Entregado` con `0/1 preparados` y, en otra fila, `Pendiente de pago` junto a `Conciliado`.
- El historial de pedido muestra `undefined` como nombre del evento.
- En una pasada anterior Cliente 007 llegó a mostrarse `Activo` en tabla y `Prospecto` en Cliente 360°; la recaptura posterior de la misma sesión ya muestra `Prospecto` en ambos lugares, por lo que este punto queda como regresión a vigilar, no como falla vigente demostrada.
- Clientes calcula `Técnico 4%`; con 1 de 60 debería ser aproximadamente 2%, y los porcentajes mostrados suman 102%.
- Ventas reemplaza los gráficos de la referencia por resúmenes textuales; además, el placeholder de fecha de emisión aparece malformado (`aaaa-mm-ddT--:--`).
- Los KPIs, nombres de columnas y filtros difieren de las referencias entregadas. Puede ser un cambio de contrato o datos distintos, pero debe confirmarse antes de darlo por correcto.

No se modificó código, no se ejecutaron acciones de escritura en la base de datos y no se dispararon botones mutadores durante la revisión.

## Método y alcance

Se revisó cada módulo en el orden solicitado, comparando:

1. La estructura y composición visual contra las imágenes de referencia entregadas.
2. La accesibilidad expuesta por el árbol semántico del navegador de la sesión del usuario.
3. Los estados, montos, relaciones y transiciones visibles en listados, paneles operativos y drawers.
4. La coherencia aritmética y relacional contra la consulta de auditoría de base de datos de solo lectura ejecutada previamente.

La revisión cubre escritorio ancho y los estados visibles de los registros inspeccionados. No equivale todavía a una certificación WCAG completa: no se pudo demostrar todo el orden de tabulación, lector de pantalla real, contraste automatizado ni una matriz completa móvil/tablet.

## 1. Pedidos

### Secciones implementadas

- Encabezado `Gestión de pedidos`, descripción y acciones `Exportar` / `Preparar pedido`.
- KPIs de pedidos activos, preparación, listos, tránsito y pendientes.
- Búsqueda y filtros de estado, entrega, moneda, pago y filtros adicionales.
- Tabla paginada con pedido, cliente, productos, total, estado logístico, atención, entrega, pago y local.
- Centro de operaciones con colas de preparación, despacho, recojo e incidencias.
- Drawer de detalle con `Resumen`, `Productos`, `Preparación`, `Entrega`, `Pago` e `Historial`.

### Comparación visual

La jerarquía visual está alineada con la referencia: tarjetas blancas, títulos navy, estados por color, tabla operativa y centro de operaciones inferior.

Hay diferencias de contrato visibles:

- La referencia pedía `Pedidos totales`, `En preparación`, `Listos`, `Entregados` y `Pendientes`; la pantalla actual presenta `Pedidos activos`, `En preparación`, `Listos`, `En tránsito` y `Pendientes`.
- La referencia mostraba filtros de prioridad y fecha; la pantalla actual muestra moneda, pago y filtros adicionales.
- La referencia mostraba prioridad y proveedor/ruta; la actual muestra atención y local.
- El árbol accesible no expone una cabecera `Acciones`, aunque las filas sí tienen botones `Ver ...`.

Estos cambios no son necesariamente un error si el contrato CP039 fue actualizado, pero sí impiden afirmar que la implementación coincide con el diseño entregado.

### Comportamiento lógico

Se inspeccionó `PED-DEV-001`:

- El listado indica `Entregado`, `Conciliado`, total `S/ 55.00` y `0/1 preparados`.
- El detalle repite `Entregado` y el producto muestra `Solicitado 1`, `Preparado 0`, `Reserva activa`.

Un pedido entregado no debería conservar cero unidades preparadas y una reserva activa sin una explicación explícita de corrección histórica. Este es el hallazgo lógico más importante del módulo.

También se observó una fila con `Pendiente de pago` y `Conciliado`. Debe definirse si “pendiente de pago” es un estado de cobro, de pedido o una alerta independiente; hoy puede inducir una decisión operativa incorrecta.

### Accesibilidad

La tabla expone encabezados, filas y celdas; los filtros tienen nombres (`Estado`, `Entrega`, `Moneda`, `Pago`), los botones de fila incluyen el identificador del pedido y el drawer tiene encabezado, pestañas y campos descriptivos. El formulario de incidencias muestra una casilla con etiqueta clara y conserva el botón deshabilitado cuando faltan datos.

### Hallazgo adicional

En `Historial` aparece `undefined · 23/8/2026, 7:20:39 p. m.`. El historial debe mostrar un nombre legible del evento o una etiqueta de fallback; nunca debe presentar `undefined` al usuario.

## 2. Clientes

### Secciones implementadas

- Encabezado con `Exportar` y `Nuevo cliente`.
- KPIs de clientes registrados, activos, por atender y oportunidades activas.
- Filtros por texto, estado, tipo, responsable y filtros adicionales.
- Tabla paginada con cliente, tipo, contacto, teléfono, email, ciudad, actividad reciente, estado y responsable.
- Resumen lateral por tipo, geografía y casos que requieren atención.
- Operaciones CRM con `Agenda`, `Actividad`, `Oportunidades` e `Historial`.
- Cliente 360° con resumen, actividad, oportunidades, cotizaciones, ventas, pedidos, pagos, contactos, direcciones y notas.

### Comparación visual

La composición principal coincide con la referencia y el detalle 360° tiene la jerarquía esperada. La referencia tenía cuatro KPIs con valores objetivo distintos y no mostraba responsable como columna principal; la implementación actual agrega responsable y mantiene el flujo CRM.

El rail horizontal de pestañas del Cliente 360° puede cortar visualmente las últimas opciones (`Direcciones`, `Notas`) en el ancho observado. Las pestañas siguen existiendo semánticamente y son seleccionables, pero la visibilidad inicial no es óptima.

### Comportamiento lógico

Se inspeccionó `Cliente corporativo 007`:

- Tabla: `Activo`.
- Cliente 360°: `Prospecto`.

Es una inconsistencia de estado para el mismo registro y debe corregirse en la fuente o en el mapeo de presentación.

Las relaciones del cliente sí fueron coherentes en el detalle: 1 oportunidad abierta, 2 ventas confirmadas, 2 pedidos y 2 pagos. Cotizaciones, contactos, direcciones y notas aparecen vacíos con acciones explícitas para agregarlos.

La distribución por tipo muestra `Empresa 44 (73%)`, `Distribuidor 15 (25%)` y `Técnico 1 (4%)`. El conteo suma 60, pero 1/60 es aproximadamente 2% y los porcentajes suman 102%. Es un error aritmético o de redondeo visible.

### Accesibilidad

La tabla, paginación, filtros, pestañas y acciones CRM aparecen con roles semánticos utilizables. Las acciones de fila se anuncian como `Acciones de ...`, y las pestañas 360° tienen nombres completos aunque algunas queden fuera del viewport.

En `Historial` se muestran nombres técnicos como `Customer.Created` y UUIDs. Es accesible para tecnología, pero no es una etiqueta suficientemente clara para un usuario operativo; conviene traducir el evento y reservar el UUID para un detalle secundario.

## 3. Ventas

### Secciones implementadas

- Encabezado con rango temporal, `Exportar` y `Registrar venta`.
- KPIs de ventas confirmadas, monto vendido, cobrado, ticket promedio y alertas.
- Resúmenes de cobrado vs. pendiente, ticket promedio, métodos y canales.
- Filtros por texto, estado, moneda, canal y filtros adicionales.
- Tabla paginada con venta, cliente, monto, documentos, cobro, estado, canal, vendedor y fecha.
- Centro de operaciones con cobros pendientes, facturación y validación.
- Drawer con resumen, productos snapshot, cobros, pedido, facturación e historial.

### Comparación visual

La estructura de la página sí está implementada, pero la sección gráfica no coincide con la imagen de referencia. La referencia mostraba donut y barras; la pantalla actual presenta tiras/resúmenes textuales:

- `Ventas cobradas vs pendientes`: texto con `S/ 55,260` y `S/ 258,700`.
- `Ticket promedio`: solo valor textual.
- Métodos de pago: conteos textuales.
- Canal: `Sin datos en este alcance`.

Si los gráficos son parte obligatoria del diseño dado, este módulo no está cerrado visualmente.

### Montos y lógica

Los cálculos visibles son internamente coherentes:

- `S/ 313,960 = S/ 55,260 cobrados + S/ 258,700 pendientes`.
- `S/ 313,960 / 120 = S/ 2,616.33` de ticket promedio.
- La venta `VTA-DEV-001` tiene total `S/ 55`, cobro recibido `S/ 55` y saldo `S/ 0`.

En el detalle, productos y cobros conservan el snapshot de venta y se relacionan con `PED-DEV-001`.

La ficha de facturación muestra el estado externo pendiente y los campos esperados, pero el placeholder de fecha aparece como `aaaa-mm-ddT--:--`, lo que comunica un formato roto y puede dificultar la captura.

El historial del detalle indica `No hay eventos de auditoría para esta venta`; dado que la auditoría global sí contiene eventos de ventas, debe validarse si se trata de ausencia real de eventos específicos o de una consulta que no está enlazando el historial.

### Accesibilidad

La tabla, filtros, drawer y pestañas son semánticos; el producto snapshot y los cobros exponen sus valores como texto legible. El control de facturación tiene nombres accesibles. La ausencia de una cabecera explícita `Acciones` también se repite en este módulo.

## 4. Pagos

### Secciones implementadas

- Encabezado con exportación.
- KPIs de monto confirmado, órdenes conciliadas, pendientes, observados y tasa.
- Distribución de estados y métodos de pago.
- Filtros de texto, estado, conciliación, método, moneda y filtros adicionales.
- Tabla paginada con pago, cliente, pedido, monto, método, estado, conciliación, referencia y fecha.
- Cola de conciliación para pendientes, diferencias, errores de proveedor y reembolsos.
- Drawer con resumen, conciliación, intentos, eventos, reembolsos e historial.

### Comparación visual

La estructura general coincide con la referencia, pero las columnas y el contrato de métricas cambiaron:

- La referencia mostraba fecha, filtros más explícitos y una columna `Comprobante`; la actual muestra pedido, conciliación y referencia.
- La referencia tenía `S/ 182,430.60`, 128 conciliados, 38 pendientes, 16 observados y 92.4%; la actual muestra `S/ 55,260`, 30 conciliadas, 30 pendientes, 0 observados y 100%.

Los valores pueden pertenecer a una base o periodo diferente. Debe confirmarse cuál es la fuente de verdad del diseño antes de considerar el cambio correcto.

### Montos y lógica

El caso conciliado `PAGO-001` es coherente: esperado `S/ 55`, recibido `S/ 55`, reembolsado `S/ 0`, neto `S/ 55`, diferencia `S/ 0`.

El caso pendiente `PAGO-002` también es aritméticamente coherente: estado `En revisión`, esperado `S/ 639`, recibido `S/ 0`, neto `S/ 0`, diferencia `-S/ 639`, y aparece en la cola con la misma diferencia. El panel ofrece confirmación manual, pero el botón permanece deshabilitado hasta completar motivo y referencia, lo cual es consistente.

La etiqueta `Tasa de conciliación 100%` puede inducir a error mientras existen 30 pagos pendientes; el texto aclara que se calcula sobre las 30 órdenes con pago neto, pero ese denominador debería ser más visible para evitar interpretar 100% como conciliación total del universo.

### Accesibilidad

La tabla, enlaces a pedidos, botones de pago, filtros, pestañas, campos de confirmación manual y cola operativa están expuestos con nombres útiles. Los estados y diferencias también aparecen en el nombre accesible de los botones de la cola.

## Validación de base de datos y coherencia transversal

La consulta de auditoría de solo lectura encontró un modelo con datos relacionados y valores permitidos:

- Clientes: 60; activos 53; prospectos 7.
- Oportunidades: 72.
- Cotizaciones: 80.
- Ventas: 120, todas `CONFIRMED`.
- Pedidos: 120; estados observados `DELIVERED 53`, `IN_TRANSIT 13`, `PAID 13`, `PAYMENT_PENDING 14`, `PREPARING 14`, `READY 13`.
- Pagos: 60; `APPROVED 20`, `CONFIRMED 10`, `PENDING 20`, `UNDER_REVIEW 10`.
- No se encontraron reembolsos en el alcance revisado.
- Las comprobaciones de monedas, relaciones, valores inválidos, reservas y trazabilidad de estados de pago resultaron válidas en la consulta realizada.

Esto indica que la base no presenta una rotura general de integridad en el alcance auditado. Los hallazgos principales están en la presentación, el mapeo de estados, las métricas contractuales y el vínculo de algunos historiales; no se debe concluir que la base esté completamente sana solo con estas comprobaciones.

## Hallazgos priorizados

| Prioridad | Hallazgo | Módulo | Acción recomendada |
| --- | --- | --- | --- |
| Alta | Pedido `PED-DEV-001` entregado con 0/1 preparado y reserva activa | Pedidos | Revisar derivación de estados logístico/picking y bloquear combinaciones imposibles o explicarlas como histórico corregido |
| Alta | `Entregado`/`Conciliado` y `Pendiente de pago`/`Conciliado` aparecen mezclados en filas | Pedidos | Definir el contrato exacto de cada estado y validar la composición de la tabla |
| Seguimiento | Verificar que el estado de Cliente 007 permanezca consistente entre tabla y 360° | Clientes | Conservar una prueba de consistencia lista/detalle; en la recaptura actual ambos muestran `Prospecto` |
| Alta | Historial de pedido muestra `undefined` | Pedidos | Corregir el fallback/render del nombre del evento |
| Alta de diseño | Los gráficos de Ventas no están implementados como en la referencia | Ventas | Confirmar contrato visual; si sigue vigente, reemplazar resúmenes textuales por visualizaciones equivalentes |
| Alta | Ventas presenta `Pendiente S/ 0.00` en ventas sin cobro | Ventas | Separar y rotular `Esperado`, `Recibido` y `Saldo`; no usar recibido como saldo pendiente |
| Alta | Drawer de pedido mezcla `Cobro Pendiente` con contexto `Pagado` | Pedidos | Separar estado logístico y estado financiero con labels inequívocos |
| Media | `Preparar pedido` abre un pedido concreto, no una cola seleccionable | Pedidos | Mostrar la cola de elegibles o explicar claramente la priorización antes de abrir el primer pedido |
| Media | Porcentaje `Técnico 4%` y suma 102% | Clientes | Calcular porcentajes desde el mismo denominador y controlar redondeo |
| Media | Placeholder de fecha de facturación malformado | Ventas | Corregir formato y ayuda de captura |
| Media | Cabecera `Acciones` no aparece en las tablas aunque existen botones por fila | Pedidos, Ventas, Pagos | Añadir encabezado o relación accesible equivalente |
| Media | `Tasa de conciliación 100%` puede interpretarse como total aunque hay pendientes | Pagos | Exponer claramente numerador/denominador |
| Baja | Eventos técnicos `Customer.Created` y UUIDs visibles al usuario | Clientes | Traducir etiquetas y dejar identificadores como información secundaria |
| Por confirmar | Historial de venta vacío pese a eventos globales de venta | Ventas | Verificar la consulta de auditoría específica por venta |

## Cierre de esta tanda

Pedidos, Clientes, Ventas y Pagos fueron revisados sección por sección con la sesión del usuario, comparando referencia visual, árbol accesible y comportamiento lógico. La implementación existe, pero la tanda queda **con observaciones abiertas**; no corresponde marcarla como aprobada hasta resolver las inconsistencias de estado y confirmar si las diferencias de KPIs, columnas, filtros y gráficos son cambios intencionales.

El siguiente paso recomendado es corregir primero los hallazgos de prioridad alta y luego continuar con los módulos restantes de la tanda usando el mismo orden: referencia visual → accesibilidad → lógica de estados/montos → validación cruzada con base de datos.

## Revisión visual adicional — misma sesión del usuario

Se repitió la captura visual el 2026-09-06 usando la pestaña activa autenticada de Brave, sin navegar a otra cuenta ni ejecutar acciones mutadoras. Las pantallas cargaron sin login wall, spinner permanente, error visible o sección en blanco.

### Confirmación por módulo

- **Pedidos:** el layout y el centro de operaciones existen, pero la vista actual sigue mostrando `67 / 14 / 13 / 13 / 14` en lugar de la composición de KPIs de la referencia. En la tabla se repite visualmente el patrón `0/x preparados` incluso en filas `Entregado`; la discrepancia es real en la UI, no un artefacto de una captura anterior. La columna final tiene acción por fila, pero no una cabecera visible `Acciones`.
- **Clientes:** encabezado, cuatro KPIs, filtros, tabla, resumen lateral y `Operaciones CRM` están implementados. La pantalla es visualmente estable y legible; la parte CRM inferior mantiene pestañas y tarjetas en dos columnas. Sigue presente `Técnico 1 (4%)`, que no corresponde al conteo mostrado.
- **Ventas:** encabezado, KPIs, filtros, tabla y las tres tarjetas inferiores (`Cobros pendientes`, `Facturación`, `Validación`) sí están implementados y se ven coherentes. La sección central sigue siendo texto alineado en columnas, no los gráficos donut/barras de la referencia; esta es la mayor diferencia visual del módulo.
- **Pagos:** KPIs, barras horizontales de estado/método, tabla y `Cola de conciliación` están implementados. La cola inferior muestra cinco pendientes y tres estados vacíos (`Con diferencia`, `Errores de proveedor`, `Reembolsos`) con enlaces `Ver todos`; visualmente el estado vacío está resuelto. Los valores de la cola siguen cuadrando: por ejemplo `PAGO-002`, esperado `S/ 639`, neto `S/ 0`, diferencia `-S/ 639`.

## Revisión de estados interactivos adicional — misma sesión

Se abrieron drawers y formularios no mutadores en Brave para comprobar que el diseño no estuviera limitado a la vista principal:

- **Clientes:** `Nuevo cliente` abre un wizard de tres pasos. Con el RUC real `20610000000` se mostró `Posible cliente existente`, la coincidencia `RUC` y el motivo obligatorio para crear de todos modos. El drawer `Fusionar clientes` permitió seleccionar principal/secundario y mostró el impacto antes de confirmar: `0 contactos`, `0 direcciones`, `2 oportunidades`, `0 cotizaciones`, `2 ventas`, `2 pedidos`, `1 actividad`, `1 tarea`, `0 notas`. No se confirmó la fusión.
- **Customer 360:** las diez pestañas tienen nombres accesibles y las acciones WhatsApp/llamada/correo exponen enlaces correctos. La medición DOM del rail confirmó `clientWidth=718` y `scrollWidth=853`, por lo que `Direcciones`/`Notas` quedan fuera de la primera vista; en la recaptura más reciente Cliente 007 muestra `Prospecto` tanto en la tabla como en el detalle.
- **Ventas:** `Registrar venta` presenta las opciones `Venta directa` y `Desde cotización aceptada`; la venta directa exige cliente, local, producto y entrega antes de habilitar la confirmación. El detalle de `VTA-DEV-001` expone snapshot, cobros, pedido y facturación externa. El formulario de facturación conserva el placeholder roto `aaaa-mm-ddT--:--` y `Historial` responde `No hay eventos de auditoría para esta venta`.
- **Ventas — contradicción adicional:** filas como `VTA-DEV-024` muestran estado `Pendiente S/ 0.00` aunque el total es `S/ 2,532.00` y no hay recibido. El monto parece ser recibido, pero el copy lo presenta como saldo pendiente; el contrato exige distinguir `expected`, `received` y `balance`.
- **Pedidos:** `Preparar pedido` abre directamente el drawer del primer elegible (`PED-DEV-024`) en vez de mostrar una cola seleccionable. El drawer sí expone Productos, Preparación, Entrega, Pago e Historial, pero muestra `COBRO Pendiente` en la cabecera y `PICKUP · Pagado` en la línea de contexto. La pestaña Pago calcula correctamente `Esperado S/ 2,532`, `Neto S/ 0`, `Diferencia -S/ 2,532`; la pestaña Historial vuelve a mostrar `undefined`.
- **Pagos:** `PAGO-002` expone conciliación `639 / 0 / 0 / 0 / -639`, confirmación manual con método/referencia/motivo y botón deshabilitado hasta completar requisitos. `PAGO-001` expone controles de reembolso con validación de saldo y motivo; no se solicitó el reembolso.

Todas estas comprobaciones fueron de lectura o de selección temporal dentro de un formulario; no se confirmó venta, pago, reembolso, picking, entrega, incidencia, merge ni alta de cliente.

## Recaptura posterior y disponibilidad del entorno — misma sesión

Al iniciar esta recaptura, `https://dev.coldpower.pe/admin/clientes` devolvió Cloudflare Error 1033 porque no había un proceso `cloudflared` activo. Se comprobó el script declarado `ops/start-public.ps1` y se ejecutó `corepack pnpm start:public`. El script completó el build, dejó Next.js escuchando en `localhost:3000` y registró cuatro conexiones del túnel para `dev.coldpower.pe → http://localhost:3000`. Tras recargar la pestaña autenticada, Clientes, Ventas, Pedidos y Pagos volvieron a renderizarse con datos reales.

La recaptura visual y accesible posterior confirmó lo siguiente:

- **Clientes:** 60/53/48/40; Cliente 007 muestra `Prospecto` en tabla y 360°; el rail de pestañas del 360° sigue recortando `Direcciones` y `Notas`; la distribución sigue mostrando `Empresa 44 (73%)`, `Distribuidor 15 (25%)`, `Técnico 1 (4%)`, que suma 102%.
- **Ventas:** 120 ventas, `S/ 313,960.00`, cobradas `S/ 55,260.00`, ticket `S/ 2,616.33`, alertas 10; la sección analítica continúa en resúmenes de texto y la fila `VTA-DEV-024` continúa mostrando `Pendiente S/ 0.00` con total `S/ 2,532.00`.
- **Pedidos:** 67/14/13/13/14; siguen las columnas actuales sin cabecera `Acciones`, las filas entregadas con `0/x preparados`, `PED-DEV-024` con `Pagado` logístico y `Pendiente` de pago, y `PED-DEV-047` con `Pendiente de pago` y `Conciliado`.
- **Pagos:** `PEN S/ 55,260.00`, 30 conciliadas, 30 pendientes, 0 observadas y 100%; la tabla mantiene `Referencia` en lugar de `Comprobante` y las barras horizontales en lugar de la composición de referencia. El drawer `PAGO-002` vuelve a mostrar `PEN 639.00` pendiente y confirmación deshabilitada hasta completar referencia/motivo.
- **Estados internos:** la venta `VTA-DEV-001` conserva el placeholder `aaaa-mm-ddT--:--` en Facturación y el historial vacío; el pedido `PED-DEV-024` conserva `Esperado S/ 2,532`, `Recibido S/ 0`, `Neto S/ 0`, `Diferencia -S/ 2,532` y el evento `undefined`.

Los logs de consola conservan errores `ChunkLoadError` ocurridos antes de levantar el túnel; después de la recuperación no se observaron nuevos errores de aplicación, solo el warning de Clerk por usar claves de desarrollo. La medición de la pestaña autorizada reportó `1920 × 861 CSS px`, `devicePixelRatio=1` y `scrollWidth=1905`; no expone una capacidad de override de viewport. Por eso la herramienta de la sesión no permitió producir aquí la matriz exacta 1440/1024/768/390 ni persistir los bytes de sus screenshots como PNG versionados.

### Veredicto de la segunda pasada

La revisión con ojos confirma el diagnóstico anterior: **no es un problema de que la página no haya levantado ni de una captura antigua**. El diseño está parcialmente implementado y el sistema responde, pero todavía hay diferencias visibles contra las imágenes de referencia y contradicciones de datos/estado que deben resolverse antes de aprobar la tanda.

## Matriz de cierre contra la especificación — verificación corriente

Se volvió a leer el texto completo de CP-037 a CP-040 y se ejecutaron nuevamente las pruebas contractuales del módulo junto con la auditoría de PostgreSQL en modo solo lectura. Los resultados son evidencia de contrato/datos, no sustituyen la comprobación visual.

| Requisito | Clientes | Ventas | Pedidos | Pagos |
| --- | --- | --- | --- | --- |
| Datos reales desde PostgreSQL | Verificado | Verificado | Verificado | Verificado |
| Estructura principal visible | Implementada | Implementada | Implementada | Implementada |
| Coincidencia visual 1:1 con referencia | No cerrada: KPIs/rail/CRM difieren | No cerrada: faltan gráficos de referencia | No cerrada: KPIs, filtros y columnas difieren | No cerrada: analytics/columnas difieren |
| Drawer/detalle contextual | Verificado | Verificado | Verificado | Verificado |
| Estados, montos y relaciones | Parcial: porcentaje de distribución incorrecto; estado lista/360 consistente en la recaptura actual | Parcial: historial específico y placeholder de fecha pendientes | Parcial: picking/reserva incoherentes en pedidos entregados | Verificado en casos observados; denominador de tasa debe comunicarse mejor |
| Responsive 1440/1024/768/390 con captura | No verificado en los cuatro viewports | No verificado en los cuatro viewports | No verificado en los cuatro viewports | No verificado en los cuatro viewports |
| Evidencia PNG obligatoria versionada | No disponible en esta sesión | No disponible en esta sesión | No disponible en esta sesión | No disponible en esta sesión |

### Evidencia ejecutada en esta revisión

- `corepack pnpm test:cp037-clients`: **8/8 PASS**.
- `corepack pnpm test:cp038-sales`: **8/8 PASS**.
- `corepack pnpm test:cp039-orders`: **11/11 PASS** (8 contractuales + 3 de dominio).
- `corepack pnpm test:cp040-payments`: **10/10 PASS**.
- `corepack pnpm qa:db-read-only`: **exit 0**; snapshot más reciente: 60 clientes, 72 oportunidades, 80 cotizaciones, 120 ventas, 120 pedidos, 60 pagos, 0 reembolsos, 632 auditorías. Las comprobaciones de moneda, relaciones, cantidades negativas, reservas inválidas y trazabilidad de estados devolvieron cero inconsistencias en el alcance de la consulta.

Los tests anteriores cubren contratos y dominio; no prueban por sí solos la fidelidad pixel a pixel ni los cuatro tamaños exigidos. Por eso la tanda conserva estado **observada, no aprobada**.

### Gates técnicos globales cerrados después de la segunda pasada

- `corepack pnpm exec tsc --noEmit`: **PASS**.
- `corepack pnpm lint`: **PASS**, 0 errores y 14 warnings preexistentes/no bloqueantes.
- `corepack pnpm build`: **PASS** con Next.js 16.2.9; las rutas administrativas y sus APIs fueron generadas correctamente.
- `git diff --check`: sin errores de whitespace; Git solo reportó avisos de conversión LF/CRLF del working tree.
- `corepack pnpm test:all`: **19/20** en la fase de inventario; la única falla intenta abrir el archivo canónico externo `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`, que no está presente. No se creó un archivo sustituto ni se alteró el catálogo para ocultar la falla.

Estos gates confirman que el proyecto compila y que los contratos de la tanda funcionan, pero no cambian el veredicto visual/lógico: las inconsistencias enumeradas arriba siguen abiertas.

## Cotejo explícito con la aceptación de los cuatro tickets

La especificación exige, además de los gates técnicos, diseño prácticamente 1:1, browser QA, responsive y cierre funcional por módulo. La evidencia actual queda así:

| Ticket | Aceptación probada | Aceptación parcial o contradicha | Evidencia que falta |
| --- | --- | --- | --- |
| CP-037 Clientes | Customer 360, búsqueda, filtros, tabs, enlaces de contacto, dedupe/merge y datos PostgreSQL | Diseño 1:1, rail 360 y porcentajes del rail | Capturas exactas 1440/1024/768/390 y PNG versionados |
| CP-038 Ventas | Multimoneda sin mezcla, cobros/ledger, venta directa protegida, detalle, exportación contractual, RBAC y tests de parcial/sobrepago | Diseño 1:1, gráficos, copy de saldo, fecha de facturación y auditoría específica visible | Responsive y PNG; verificación aislada de mutaciones financieras |
| CP-039 Pedidos | State machine y picking de dominio, métodos pickup/delivery/shipping, reservas/incidencias contractuales, exportación y separación financiera | Fulfillment visible: `0/x` en entregados, estados pago/logística contradictorios, historial `undefined` y CTA que abre un único pedido | Responsive y PNG; mutaciones sobre fixtures aislados |
| CP-040 Pagos | Ledger, conciliación, parcial/sobrepago, reembolso/idempotencia en tests, pago manual condicionado, RBAC y exportación | Diseño 1:1 de analytics/tabla y comunicación del denominador de tasa | Responsive y PNG; refresh/provider/error/refund sobre fixtures aislados |

Por tanto, los checks verdes demuestran implementación de contratos y dominio, pero no satisfacen por sí solos la aceptación visual, responsive y de estados reales exigida por R1–R6.
