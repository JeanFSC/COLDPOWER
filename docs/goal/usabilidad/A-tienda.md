# A — QA final local de tienda pública

Fecha: 2026-09-24  
Base: PostgreSQL 18 local, servicio `postgresql-18-coldpower`, `127.0.0.1:5433`, `.env.localdb`.  
Servidor: artefacto de `next build` servido con `next start` en `http://localhost:3003`; bypass de desarrollo por rol.  
CMS: oculto por decisión de Jean; no se modificó.

## Método y límites

Se probaron tienda móvil a 390×844 y escritorio a 1920×1080, con Playwright, consola y rutas reales. Se cruzaron precio/no precio, SKU exacto, datos técnicos con unidades, usuario anónimo, cliente de prueba y estados con datos locales. La sesión de cliente usa el bypass local: la interfaz de Clerk sigue mostrando parte del estado firmado como “Ingresar”, por lo que esa limitación se registra y no se interpreta como una sesión comercial real.

No se cubrieron completamente 768/1024/1440, red 3G/corte, expiración de sesión, pago rechazado, edición de perfil, lector de pantalla ni la secuencia completa de cotización a venta. Esas ausencias quedan como ❌ de cobertura, no como aprobación implícita.

## Escenarios A

| Escenario | Resultado | Evidencia y recorrido | Factores D cubiertos | Severidad / archivo:línea |
|---|---|---|---|---|
| A1.1 Buscar por código | ✅ | `6871JB1103H` devolvió un único producto y abrió la ficha correcta en móvil. Capturas: [`qa-final-a1-1-search-6871-390x844.png`](capturas/qa-final-a1-1-search-6871-390x844.png), [`qa-final-a1-1-producto-6871-390x844.png`](capturas/qa-final-a1-1-producto-6871-390x844.png). | Móvil 390; anónimo; SKU exacto; teclado/tap; navegación por ficha. | —; búsqueda tokenizada en [`catalog-repository.ts`](../../src/lib/catalog-repository.ts:43). |
| A1.2 Pieza sin código | ❌ | La búsqueda `capacitor 35 uF 440V` no mostró un candidato público válido. La fuente local solo tiene coincidencias de 35 µF/450 V en revisión; no se inventó compatibilidad ni producto. La pantalla vacía fue honesta. Captura de contexto: [`qa-final-catalogo-390x844.png`](capturas/qa-final-catalogo-390x844.png). | Móvil; búsqueda técnica; unidades `uF/µF`; producto sin publicación; estado vacío. | P1 de cobertura de catálogo, no defecto funcional confirmado; la prueba del XLSX externo falla en [`inventory-import.test.mjs`](../../scripts/inventory-import.test.mjs:16) por archivo ausente. |
| A1.3 Pedir precio | ✅ con fricción P2 | Se agregó el SKU sin precio, se completó nombre, DNI, teléfono, ubicación, preferencia y consentimiento; se persistió la solicitud con seguimiento `CP-20260924-PPOJ` y confirmación “Solicitud registrada”. El límite de ≤5 toques no se cumple de forma realista por los campos obligatorios. Evidencia adicional: log de quote y estado de cotización en base local; captura de ficha [`qa-final-producto-6871-390x844-after-fixes.png`](capturas/qa-final-producto-6871-390x844-after-fixes.png). | Móvil; anónimo; producto cotizable; tildes; validación; persistencia transaccional. | P2 UX; formulario distribuido entre [`QuoteForm.tsx`](../../src/components/quote/QuoteForm.tsx:235) y [`QuoteForm.tsx`](../../src/components/quote/QuoteForm.tsx:383). |
| A1.4 Contacto rápido | ❌ | Desde la ficha no se abre WhatsApp con el producto: el CTA disponible lleva a `/contacto#solicitud` y `NEXT_PUBLIC_WHATSAPP_NUMBER` está vacío en `.env.localdb`. No se inventó un teléfono. | Móvil; producto cotizable; deep-link; configuración ausente. | P1: no se puede completar el objetivo de un toque; [`ProductDetail.tsx`](../../src/components/product/ProductDetail.tsx:56), [`.env.localdb`](../../.env.localdb:7). |
| A2.1 Compra directa | ✅ | Producto con precio `CP-REF-VEN-0039`: carrito, checkout Lima, pago mock, pedido `ORD-20260924-C46B01`, cuenta y seguimiento. La entrega posterior se cerró con shipment, guía y receptor. Capturas: [`qa-final-a2-cart-1920x1080.png`](capturas/qa-final-a2-cart-1920x1080.png), [`qa-final-a2-order-paid-1920x1080.png`](capturas/qa-final-a2-order-paid-1920x1080.png), [`qa-final-c2-delivered-1920x1080.png`](capturas/qa-final-c2-delivered-1920x1080.png). | Escritorio; precio; stock/reserva; mock payment; Lima; cuenta; seguimiento; consistencia SQL. | —; integridad posterior: subtotal/total S/120, reserva consumida, stock no negativo. |
| A2.2 Carrito mixto | ✅ | El SKU sin precio se mostró como “Solo cotizable”, “Precio por cotización” y no mutó el carrito; se ofreció cotizar sin perder el contexto. Captura: [`qa-final-producto-6871-390x844-after-fixes.png`](capturas/qa-final-producto-6871-390x844-after-fixes.png). | Producto sin precio; guard de carrito; usuario anónimo; estado explicativo. | —. |
| A2.3 Seguimiento | ✅ con observación P2 | `/cuenta`, `/cuenta/pedidos` e historial cargaron el pedido y el seguimiento local; la ruta se encontró desde el flujo de cuenta. Captura: [`qa-final-a2-follow-up-1920x1080.png`](capturas/qa-final-a2-follow-up-1920x1080.png). El bypass no reproduce el header visual de Clerk autenticado. | Cliente recurrente; deep-link; historial; desktop; estado entregado. | P2 de harness, no de ownership: [`dev-auth-bypass.ts`](../../src/lib/dev-auth-bypass.ts:1). |
| A2.4 Pago rechazado | ❌ | No se ejecutó la secuencia de rechazo y reintento; no se afirma que el carrito sobreviva a ese caso. | Pago rechazado; reintento; idempotencia; sesión. | P2 cobertura pendiente; —. |
| A3.1 Historial y repetir | ✅ | Historial de cotizaciones/pedidos y acceso de repetición cargaron en la cuenta. Captura: [`qa-final-a3-account-1920x1080.png`](capturas/qa-final-a3-account-1920x1080.png). | Cliente recurrente; historial; datos persistidos; escritorio. | —. |
| A3.2 Datos de facturación | ❌ | No se completó una edición y relectura de RUC/dirección de facturación en esta pasada. | Cliente recurrente; campos vacíos; persistencia; sesión. | P2 cobertura pendiente; —. |
| A4.1 Entender la propuesta | ✅ | El hero comunica “REPUESTOS Y SOLUCIONES TÉCNICAS” y deja visibles las acciones principales en desktop y móvil. Capturas: [`qa-final-home-1920x1080-after-fixes.png`](capturas/qa-final-home-1920x1080-after-fixes.png), [`qa-final-home-390x844-after-fixes.png`](capturas/qa-final-home-390x844-after-fixes.png). | Primera visita; 390/1920; CTA; composición aprobada; contraste. | —; solo se hicieron ajustes puntuales de accesibilidad. |
| A4.2 Reclamos y contacto | ✅ | El footer muestra “Libro de reclamaciones” y `/sitemap.xml`; el libro carga y el contacto sigue visible. El enlace roto `/mapa-de-sitio` fue corregido. Captura: [`qa-final-a4-footer-1920x1080.png`](capturas/qa-final-a4-footer-1920x1080.png). | Visitante; footer; ruta 404; legal oculto; teclado/enlaces. | Corregido P1/P2: [`Footer.tsx`](../../src/components/layout/Footer.tsx:37), [`Footer.tsx`](../../src/components/layout/Footer.tsx:79). |

## Hallazgos de tienda

- Corregido: el enlace de sitemap del footer ya no dirige a una ruta 404; apunta a `/sitemap.xml`.
- Corregido: el Libro de reclamaciones permanece accesible aunque las páginas legales configurables estén ocultas.
- Corregido: búsquedas con varios términos se resuelven por tokens y variantes `uF/µF`; no se relajó la publicación de productos en revisión.
- Corregido: caracteres mojibake visibles en el historial de cuenta.
- Pendiente P1: configurar el número de WhatsApp comercial y repetir A1.4 con producto preseleccionado.
- Pendiente P1 de datos: restaurar/verificar el XLSX externo y repetir A1.2; no publicar datos técnicos no revisados.
- Pendiente P2: reducir fricción del formulario o redefinir honestamente el límite de cinco toques; probar rechazo de pago, perfil y estados de sesión.

## Resultado global A

La tienda completa compra directa, cotización transaccional y seguimiento con datos locales. No se cierra como “sin defectos”: A1.2, A1.4, A2.4 y A3.2 siguen sin cumplir el objetivo completo o sin cobertura suficiente.

## R2 - correcciones ejecutadas

Fecha: 2026-09-24. Alcance: `docs/goal/briefs/17-R2-correcciones.md`. La base usada en las pruebas de datos fue PostgreSQL 18 local (`127.0.0.1:5433`, `.env.localdb`); no se usó Neon ni se tocaron los puertos 3004/3007.

| Corrección | Resultado verificable |
|---|---|
| Header móvil | ✅ A 360×800, 390×844 y 430×932 el logo y las cinco acciones permanecen visibles; `scrollWidth === clientWidth`; el menú móvil abre y conserva sus enlaces. Evidencia: [`home-header-360x800.png`](../evidencia/17r2/home-header-360x800.png), [`home-header-390x844.png`](../evidencia/17r2/home-header-390x844.png), [`home-header-430x932.png`](../evidencia/17r2/home-header-430x932.png). |
| WhatsApp desde producto/cotización | ✅ El número se lee únicamente desde Company Settings; el mensaje incluye nombre, SKU y URL canónica. Con el número local sin configurar, el CTA no se muestra ni inventa un contacto; queda pendiente configurar el dato comercial y repetir el recorrido autenticado. |
| Búsqueda de catálogo | ✅ Búsqueda server-side paginada por tokens y campos técnicos; `uF`, `µF` y `μF` se normalizan, igual que espacios y acentos. La prueba contra el catálogo PG local pasó; la consulta técnica sin producto publicado sigue mostrando estado vacío honesto. |
| Almacén sin finanzas | ✅ La proyección de pedidos, métricas, detalle y exportación oculta importes sin `sales.view`/`payments.view`; los contratos de pedidos/RBAC pasan. |
| Más vendido | ✅ La etiqueta se muestra solo para el primer producto del ranking real de ventas confirmadas; sin ranking no se fabrica una insignia. |
| Cotización | ✅ El mínimo real queda en nombre + teléfono o email + ítems; DNI, RUC, dirección y demás campos son opcionales en la entrada inicial y se reservan para la conversión. La persistencia transaccional y los estados server-side pasan. |
| IGV | ⚠️ Se muestran Operación gravada, IGV y Total, pero el resultado queda `Por configurar` porque el esquema local tiene `tax_type` de producto y no tiene tasa/modo de compañía ni columnas fiscales de pedido suficientes. No se inventó una inclusión de precios ni un importe operativo. |
| DNI/RUC | ✅ DNI exige 8 dígitos; RUC exige 11 dígitos, prefijos 10/15/17/20 y módulo 11. |
| Fechas | ✅ Auditoría, ventas, pedidos y reportes usan día calendario de Lima; la frontera 23:30 Lima queda cubierta por prueba automatizada. |

### Gate visual R2

La composición del Home se mantuvo contra la referencia entregada; solo se hicieron correcciones de layout móvil, prioridad de carga y estados funcionales. La inspección pública en 1920×1080 y 390×844 no registró errores de consola. Sin embargo, el navegador disponible devolvió `dev-browser-missing`/`signed-out`, por lo que esta pasada no es una aprobación de sesión autenticada.

El PostgreSQL local no tiene media activa para productos: las tarjetas muestran `Imagen referencial`. No se sustituyeron esas imágenes con datos inventados; el gate de fidelidad de fotografías de producto permanece **BLOCK** hasta cargar/verificar media comercial real. Captura general: [`home-1920x1080.png`](../evidencia/17r2/home-1920x1080.png).

La prueba de inventario tampoco se puede cerrar porque falta el XLSX fuente externo; el fallo exacto es `ENOENT` para `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`, no un fallo de la lógica R2.
