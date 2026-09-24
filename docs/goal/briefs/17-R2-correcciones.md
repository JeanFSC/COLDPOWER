# Brief 17-R2 — Correcciones consolidadas (Codex, orden de Claude)

Hallazgos cruzados de Codex (`docs/goal/usabilidad/*.md`) y Gemini (`docs/goal/usabilidad/gemini/informe.md`), verificados por Claude. Base de datos local PG18 (`.env.localdb`, puerto 5433). Nunca Neon. Rama `codex/goal-impecable`, carpeta principal. Puerto QA: 3003. Mismas reglas de evidencia (capturas en `docs/goal/evidencia/17r2/`).

**El home es espejo (ver `docs/goal/designs/home-espejo/`): no se rediseña**; solo arreglos puntuales sin cambiar la composición.

## Decisiones de Claude (implementar tal cual)
1. **Header móvil (P1, confirmado):** a 390 y a 360 px, el logo empuja fuera de pantalla el carrito y el menú, y el banner de vista previa se corta. Deben verse **todos** los iconos (buscar, cuenta, cotización, carrito, menú) sin desborde. Ajusta el tamaño del logo solo en móvil. Captura a 360, 390 y 430.
2. **WhatsApp en la ficha (P1):** botón "Consultar por WhatsApp" en la ficha y en el carrito de cotización.
   - Usa el número de la configuración de la empresa (no hardcodeado).
   - El mensaje va prellenado con el nombre, el SKU y la URL del producto.
   - Si no hay número configurado, **no se muestra**. No inventes un número.
3. **Búsqueda tokenizada (P1):** "capacitor 35 uF 440V" debe encontrar productos por tokens (AND entre palabras, en servidor, paginado).
   - Normalización: µ/u/μ, mayúsculas, tildes, espacios en medidas ("35uF" = "35 uF").
   - Incluye SKU, nombre, marca, modelo y atributos técnicos (capacitancia, voltaje, etc.) según AGENTS.md.
   - Prueba de comportamiento con casos reales del catálogo.
4. **Montos visibles para Almacén (P2, verificar y corregir):** los roles sin permiso de ventas/pagos no ven montos (columna TOTAL, métricas y drawer de `/admin/pedidos`), **ni en la UI ni en la API**. Prueba de permisos por rol.
5. **Badge "Más vendido" (P3):** solo cuando hay un ranking real por ventas; como en la referencia, solo en el primero del ranking, no en las 6 tarjetas.
6. **Rendimiento (P1):**
   - CLS del footer (0,25–0,40): elimina el salto de layout (reserva de espacio, fuentes, hidratación).
   - LCP móvil 5 s: `priority` y `sizes` correctos en el hero, preload de la fuente, menos JS de cliente en home, catálogo y ficha.
   - Meta: LCP < 2,0 s, CLS < 0,05 y Performance ≥ 90. Lighthouse antes/después en `rendimiento.md`.
7. **IGV (P2):** en carrito, checkout, detalle de pedido (cliente y admin) y comprobantes, muestra el desglose **Op. gravada + IGV 18% = Total**.
   - Usa la configuración tributaria existente (`tax_type` del producto y el % de la empresa). Asume precios con IGV incluido solo si el sistema ya lo define así; si no está definido, repórtalo y no inventes.
   - Los productos exonerados o inafectos, según `tax_type`.
8. **Fricción al cotizar (P2):**
   - Para **cotizar** solo son obligatorios: nombre, teléfono **o** email y los ítems.
   - DNI/RUC y la dirección completa (departamento/provincia/distrito) pasan a ser **opcionales** al cotizar y **obligatorios** al convertir en venta o al pagar en el checkout.
   - Actualiza las validaciones de servidor y de UI de forma coherente.
9. **RUC (P3):** validación con el dígito verificador (módulo 11 de SUNAT) y el prefijo válido (10/15/17/20). DNI de 8 dígitos.
10. **Filtros de fecha (P3):** verifica el posible desfase de 5 h en los filtros por día (dashboard, reportes, pedidos y auditoría) y corrígelo para usar el día calendario de Lima. Prueba con un pedido a las 23:30 de Lima.

## Verificación
- Sin commit.
- `tsc`, lint (0/0), `test-all` (solo se acepta el Excel externo) y `build`.
- Actualiza los informes afectados (A-tienda, rendimiento) con el resultado.
- Reporta por número.
