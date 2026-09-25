# Justificación de ajuste de fixture B1.4

El contrato `scripts/qa/b-1-4-discount.mjs` usaba el SKU histórico `CP-ROT-8284` (`CP-ROT`). La consulta SQL local previa a esta ronda confirmó que ese SKU ya no existe entre los productos públicos publicados; por tanto, el selector del recorrido no podía representar una solicitud comercial real sin inventar o reintroducir catálogo.

Para repetir el comportamiento por UI se sustituye únicamente la referencia de fixture por `CP-REF-MCP-0103`, producto persistido y publicado en la misma base local. No se modifica el contrato funcional del test: sigue creando una regla de descuento por UI, creando una solicitud por UI, abriendo el editor y verificando que existen controles de descuento. El flujo completo de 15% → pendiente → aprobación se cubre adicionalmente en `scripts/qa/r3-7-discount.mjs`.

El selector anterior también combinaba nombre y SKU con una expresión que no atravesaba el salto de línea del nombre accesible. Se reemplaza por el locator del listado y su SKU, que expresa la misma intención comercial sin depender del formato visual de dos líneas.

El contrato también esperaba solo 900 ms después de pulsar `Solicitar cotización` y consultaba SQL mientras la UI todavía mostraba `Enviando solicitud...`; se añadió espera del response 201 de `/api/cotizacion` y del estado `Solicitud registrada`. Es una corrección de sincronización del mismo escenario, necesaria para que su prueba de comportamiento no dependa de una carrera temporal.

En dos ejecuciones posteriores, el dev server produjo una navegación de cotización sin cargar la sugerencia (una de ellas registró `SyntaxError: Invalid or unexpected token`); la reproducción controlada del mismo cambio de ruta obtuvo el endpoint de búsqueda 200. El contrato conserva el mismo flujo y añade una única recarga de recuperación documentada (`00-public-search-retry`) para no convertir esa condición transitoria del entorno webpack en un falso bloqueo del escenario.

La captura `06-quote-detail.png` mostró el drawer en `Cargando detalle...` cuando el contrato evaluó `isVisible()` de `Editar`; como esa comprobación no esperaba el estado final, se reemplazó por una espera explícita de 30 s del mismo botón. El log del servidor registró 6.2 s para `/admin/cotizaciones`, por lo que no se cambia el comportamiento probado.
