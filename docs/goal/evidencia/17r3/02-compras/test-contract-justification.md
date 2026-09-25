# Justificación de la corrección de evidencia B3.3

La primera ejecución de `b-3-3-receiving.mjs` confirmó por UI y por SQL que la recepción creó una entrada de inventario, pero la aserción devolvió `kardexMovements=0`. La causa raíz fue el predicado de evidencia: el script buscaba `inventory_movements.reference_type='PURCHASE_RECEIPT'`, mientras `receivePurchase` persiste el valor contractual vigente `purchase_receipt` (y el lector del Kardex también reconoce ese valor).

Se corregirá únicamente ese filtro de evidencia de QA a `purchase_receipt`. No se modifica un contrato de producto, una API ni la lógica transaccional; el movimiento real ya estaba persistido y se verificó con la consulta local equivalente.

La segunda ejecución mostró la aserción transaccional verde (`PARTIAL_RECEIVED`, cantidades, recepción, ítems y Kardex = 1), pero el paso visual del Kardex usaba un placeholder antiguo. Se actualizará solo el locator a la etiqueta vigente `SKU, modelo, refrigerante, voltaje…`, porque el componente actual conserva la misma función y el cambio no altera la UI.

La tercera ejecución confirmó la misma aserción y encontró que `RowActionMenu` renderiza los comandos como botones normales, no como `role=menuitem`. Se actualizará únicamente ese locator a un botón accesible con nombre `Ver Kardex`; es una corrección de la prueba al DOM vigente, no un cambio de producto.

La inspección directa del DOM mostró además una versión desktop y otra mobile del listado; el primer botón con ese nombre puede estar oculto por CSS. El locator final se limitará a `button:visible` para probar la interacción que realmente ve el usuario en 1920×1080.

## Diagnóstico B4.1

La primera ejecución de `b-4-1-purchase-flow.mjs` devolvió un bloqueo al consultar la solicitud inmediatamente después del `POST`. La evidencia del navegador no registró errores de consola, errores de página ni fallos de red; el servidor registró `POST /api/admin/compras/solicitudes 201` y PostgreSQL local contiene la solicitud `SOL-20260925-FAB8B0` en `DRAFT`, con la nota exacta y la auditoría `purchases.request_created`. Por tanto, no es un fallo del flujo comercial: es una carrera de lectura de la prueba contra el ciclo de compilación/renderizado de Next en desarrollo. La prueba de continuación usa el registro ya creado, espera la fila en PostgreSQL y vuelve a validar las mutaciones de enviar, aprobar y convertir desde la UI.
