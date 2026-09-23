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

## Criterio transversal
- **Cada rol ve solo lo suyo** y nunca aterriza en una página que no puede usar.
- **Todo ID visible es un link** al módulo dueño, ya filtrado.
- **Lenguaje del usuario**, no técnico: nada de enums crudos (PENDING, CONFIRMED), ni "Guardado en Neon", ni códigos internos.
- **Móvil real** para la tienda (técnico) y **1366–1920** para el admin (escritorio de oficina), sin que el admin se rompa en tablet.
