# Pruebas de uso real por persona — ColdPower

> Objetivo: que cada tipo de usuario pueda hacer **su trabajo real de punta a punta**, con el criterio que tendría esa persona, sin ayuda y sin fricción. No basta con "no hay errores": se mide si la tarea se entiende y se completa rápido.
> Se ejecuta **al cerrar cada módulo** (escenarios de ese módulo) y **completo en la fase D**. Navegador real, 1920×1080 y 390 px, con el usuario del rol (bypass de dev por rol, fixtures de demo coherentes).

## Cómo se evalúa cada escenario
| Métrica | Aprobado si |
|---|---|
| Completa la tarea | Sí, sin salir del flujo ni usar la URL a mano |
| Clics / toques | ≤ el máximo indicado en el escenario |
| Primera acción obvia | La acción principal es visible sin scroll y se entiende sin leer párrafos |
| Errores / callejones | 0 pantallas sin salida, 0 mensajes técnicos, 0 `undefined`/NaN |
| Tiempo percibido | Sin esperas > 2 s sin feedback (skeleton/estado) |
| Confianza | El usuario sabe qué pasó (confirmación clara) y qué sigue |

Cada escenario se registra en `docs/goal/usabilidad/<fecha>-<persona>.md` con: pasos reales, clics, capturas, fricciones (P0–P3) y veredicto. Fricciones P0/P1 vuelven a Codex como corrección antes de cerrar el módulo.

---

## A. Usuario normal (tienda pública)

### A1. Técnico en campo (móvil 390 px, con prisa)
- **A1.1 Buscar por código**: tiene el código `6871JB1103H`. Llegar a la ficha correcta. **≤ 2 toques** desde el home.
- **A1.2 Pieza sin código**: busca "capacitor 35 uF 440V" → filtra → encuentra candidatos y entiende cuál es por la imagen y 1 dato clave. **≤ 4 toques**.
- **A1.3 Pedir precio**: producto sin precio → agrega a cotización → envía su solicitud (nombre, WhatsApp) → recibe confirmación con código de seguimiento. **≤ 5 toques**, sin crear cuenta.
- **A1.4 Contacto rápido**: desde la ficha abre WhatsApp con el producto ya mencionado. **1 toque**.

### A2. Comprador de taller (escritorio)
- **A2.1 Compra directa**: producto con precio → carrito → inicia sesión → checkout (delivery Lima) → paga (mock) → ve su pedido con seguimiento. Entiende en cada paso cuánto paga y qué falta ("Envío: por coordinar").
- **A2.2 Carrito mixto**: intenta agregar un producto sin precio al carrito → entiende que es "Solo cotizable" y lo manda a cotización sin perder su carrito.
- **A2.3 Seguimiento**: vuelve al día siguiente → encuentra su pedido y el estado del envío en **≤ 3 clics** desde el home.
- **A2.4 Pago rechazado**: el pago falla → entiende qué pasó y reintenta sin rearmar el carrito.

### A3. Empresa / cliente recurrente
- **A3.1** Revisa su historial de cotizaciones y pedidos en "Mi cuenta", repite un pedido.
- **A3.2** Actualiza sus datos de facturación (RUC, dirección).

### A4. Visitante que duda
- **A4.1** Entiende en 3 segundos qué vende ColdPower y cómo comprar (home sin leer párrafos).
- **A4.2** Encuentra cómo reclamar (Libro de reclamaciones) y cómo contactar.

---

## B. Usuarios del sistema (admin)

### B1. Ventas (VENTAS / OPERACIONES_VENTAS)
- **B1.1 Atender solicitud web**: llega notificación → abre la cotización (1 clic desde la notificación) → pone precios → envía (v1) → registra respuesta del cliente → convierte en venta y pedido → ve links a venta y pedido.
- **B1.2 Seguimiento del día**: abre su inicio → ve "seguimientos de hoy / vencidos" → completa uno → desaparece de su cola.
- **B1.3 Cliente 360**: busca un cliente por teléfono → ve cotizaciones, ventas, pedidos y pagos → salta a cualquiera con 1 clic.
- **B1.4 Descuento**: pide un descuento sobre el umbral → queda bloqueado con mensaje claro → espera aprobación.

### B2. Gerencia (GERENCIA)
- **B2.1 Aprobar descuento** desde la notificación o el drawer de la cotización.
- **B2.2 Lectura del negocio**: en ≤ 1 minuto responde "¿cuánto vendimos este mes, cuánto está por cobrar y qué stock está crítico?" desde Dashboard/Reportes, sin mezclar monedas.
- **B2.3 Reembolso**: detecta un pago en "Por reembolsar" → lo procesa → queda registrado.

### B3. Almacén (ALMACEN)
- **B3.1 Preparar pedido**: abre su cola de pedidos pagados → prepara (picking) → marca listo → entrega/despacha → avanza seguimiento. Nunca ve pagos.
- **B3.2 Críticos**: ve productos críticos de su local en 1 clic → crea solicitud de compra.
- **B3.3 Recibir traslado / recibir compra** por líneas de la OC, sin duplicar stock con doble clic.
- **B3.4 Ajuste por conteo** con motivo, y lo ve en el Kardex.

### B4. Compras (COMPRAS)
- **B4.1** Convierte una solicitud en OC con costos por línea → emite → sigue retrasos del proveedor.
- **B4.2** Ve gasto por proveedor separado por moneda.

### B5. Caja / pagos (quien tenga payments.*)
- **B5.1** Concilia pagos pendientes, registra un pago manual con monto editable, registra una devolución manual.

### B6. Reportes (REPORTES)
- **B6.1** Entra y aterriza en Reportes → exporta el reporte del mes con moneda y rango → programa uno semanal y ve que se ejecuta.

### B7. Superadmin (SUPERADMIN)
- **B7.1** Invita un usuario con un rol → cambia un rol con confirmación → lo ve en Auditoría (1 clic desde el usuario).
- **B7.2** Cambia datos de la empresa y restaura una versión anterior.
- **B7.3** Publica/despublica un producto con foto propia y la ve en la tienda.

---

## C. Recorridos integrados cliente ↔ sistema (de punta a punta)

Cada recorrido cruza la tienda y el admin: lo que hace el cliente dispara trabajo en el sistema y el cliente debe ver el resultado. Se ejecuta con dos navegadores/sesiones a la vez (cliente y staff).

| # | Recorrido | Cliente | Sistema (roles) | El cliente ve al final |
|---|---|---|---|---|
| C1 | Cotización web → venta | Pide precio de 3 productos sin cuenta | Ventas recibe notificación, cotiza, envía; cliente acepta; Ventas convierte; Almacén prepara; Caja confirma pago manual | Su cotización con estado, y luego el pedido con seguimiento |
| C2 | Compra online con delivery | Compra con precio, paga (mock) | Almacén prepara y despacha; avanza seguimiento; entrega | Timeline completo + seguimiento del envío |
| C3 | Compra con pago rechazado y vencimiento | Paga, rechaza, no reintenta | Sistema cancela al vencer y libera stock; si llega aprobación tardía → "Por reembolsar"; Gerencia reembolsa | Pedido cancelado con motivo claro; reembolso visible |
| C4 | Envío a provincia | Compra con agencia | Almacén despacha por agencia (AT_AGENCY), incidencia de faltante, resuelve | Estados de agencia y aviso de incidencia |
| C5 | Recojo en tienda | Compra PICKUP | Almacén marca listo para recojo; cliente recoge; se registra quién recibió | "Listo para recojo" con dirección del local |
| C6 | Cliente recurrente | Repite un pedido desde historial | Ventas ve el cliente 360 con todo el historial | Historial y pagos coherentes |
| C7 | Stock agotado en el camino | Dos clientes compran la última unidad a la vez | Solo uno reserva; el otro recibe mensaje claro; Compras recibe alerta de crítico y crea OC; al recibir, vuelve a haber stock | El segundo cliente entiende que no hay stock y puede cotizar |
| C8 | Promoción | Compra un producto en promoción aprobada | Gerencia creó/aprobó la promo; al rechazarla deja de aplicarse | Precio con descuento igual en ficha, carrito y pedido |
| C9 | Devolución / anulación | Pide anular tras pagar | Ventas anula (bloqueado si hay dinero) → Caja registra devolución → pedido cancelado | Estado final coherente con el dinero |
| C10 | Producto nuevo | — | Catálogo crea producto con foto, precio y stock; publica | Aparece en búsqueda, categoría y ficha con su foto |

## D. Matriz de factores (se cruza con cada escenario A/B/C)

Para cada escenario se hipotetizan y prueban **todos** los factores que apliquen. Un escenario no está aprobado hasta cubrir su fila de factores.

| Factor | Variantes a probar |
|---|---|
| **Dispositivo** | Móvil 390, tablet 768, laptop 1366, escritorio 1920; táctil y teclado |
| **Red** | Rápida, lenta (3G simulado), corte a mitad de acción (reintento sin duplicar) |
| **Sesión** | Anónimo, recién registrado, sesión expirada a mitad del checkout, dos pestañas abiertas |
| **Primera vez vs recurrente** | Sin historial (estados vacíos que guían) y con mucho historial (paginación, búsqueda) |
| **Datos del producto** | Con y sin precio, con y sin stock, con y sin foto (imagen referencial), nombre largo, specs faltantes |
| **Volumen** | 0, 1, pocos y muchos registros (listas paginadas, rendimiento) |
| **Entrada del usuario** | Vacía, inválida, extremos (cantidad 0, 999, negativa), caracteres especiales/tildes, copiar-pegar con espacios |
| **Doble acción** | Doble clic/envío, volver atrás y reenviar, refrescar en medio (idempotencia) |
| **Concurrencia** | Dos usuarios editando el mismo registro (conflicto de versión claro), última unidad de stock |
| **Tiempo** | Vencimiento de pago (30 min), fin de mes/rangos de fecha, zona horaria Lima, fechas límite de cotización |
| **Dinero** | Soles y dólares, redondeo, descuento, pago parcial, sobrepago, reembolso total/parcial, promoción |
| **Permisos** | Cada rol: qué ve, qué puede hacer, qué pasa si abre una URL que no le corresponde |
| **Errores del sistema** | Base de datos caída, proveedor de pago caído, notificación fallida: mensaje humano + reintento, sin perder datos |
| **Accesibilidad** | Solo teclado, lector de pantalla (encabezados, labels, alt), contraste AA, `prefers-reduced-motion` |
| **Idioma y tono** | Español peruano claro, sin enums ni jerga técnica, tildes correctas |
| **Navegación** | Botón atrás del navegador, enlaces compartidos (deep-links) abiertos por otra persona, 404 útil |

## E. Registro y severidad
- Cada ejecución se guarda en `docs/goal/usabilidad/<fecha>-<escenario>.md`: persona, dispositivo, factores cubiertos, pasos, clics, capturas, fricciones y veredicto.
- **P0**: pierde dinero/datos o expone datos. **P1**: no puede completar la tarea. **P2**: la completa con fricción o confusión. **P3**: pulido.
- P0/P1 bloquean el cierre del módulo; P2 se corrigen o se justifican; P3 van a una lista final.
- Fase D: se ejecutan A + B + C completos cruzados con la matriz D, y se entrega un reporte con cobertura (escenario × factor) y capturas.

## Criterio transversal
- **Cada rol ve solo lo suyo** y nunca aterriza en una página que no puede usar.
- **Todo ID visible es un link** al módulo dueño, ya filtrado.
- **Lenguaje del usuario**, no técnico: nada de enums crudos (PENDING, CONFIRMED), ni "Guardado en Neon", ni códigos internos.
- **Móvil real** para la tienda (técnico) y **1366–1920** para el admin (escritorio de oficina), sin que el admin se rompa en tablet.
