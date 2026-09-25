# Inventario de QA — M10-03 tienda pulido

## Referencia y alcance

- Fuente visual del producto: `docs/goal/usabilidad/capturas/baseline-producto-6871-1920x1080.png` y `baseline-producto-6871-390x844.png`.
- Runtime validado: `http://localhost:3006`, viewport principal `1920 × 1080`, viewport responsive `390 × 844`, zoom 100%.
- Datos: catálogo persistente local de `.env.localdb`; producto real `CP-REF-CAP-0412`.
- Home espejo: no se modificó `src/app/page.tsx` ni componentes bajo `src/components/home/`.

## Matriz de afirmaciones

| Afirmación | Control | Resultado | Evidencia |
| --- | --- | --- | --- |
| La identidad no expone metadatos fuente | DOM y contrato de copy | Pasó; `Estado fuente:` y `sourceStatus` ausentes | `final-clean/after-route-report.json`, `focused-product-check.txt` |
| El estado comercial es único y accionable | Conteo de `Bajo consulta` | Pasó; conteo 1 | `final-clean/after-route-report.json` |
| No se inventa descripción familiar | Producto sin editorial real | Pasó; fallback real de aplicación, sin filler | `final-clean/after-route-report.json`, captura de producto |
| La compra/cotización tiene prioridad visual | Caja dentro de 1080 px | Pasó; `top=562`, `bottom=1042` | `final-clean/after-producto-...-check-1920x1080.png` |
| La unidad SUNAT se presenta comercialmente | `UNIDAD (BIENES)` / `NIU` | Pasó; ambos mapean a `Unidad` | `scripts/catalog-view-model.test.ts` |
| El CTA móvil no cubre contenido | Bounding box en 390 × 844 | Pasó; barra en `y=771..844` | `focused-product-check.txt`, captura móvil |
| El journey real persiste la cotización | POST 201 + SQL | Pasó; snapshots y estado inicial persistidos | `final-journey/after-journey-confirmation-1920x1080.png`, `sql-journey.txt` |
| Las rutas públicas son navegables | Matriz desktop/mobile | Pasó en visita aislada; la matriz rápida registra carreras dev separadas | `final-routes/after-route-report.json`, `focused-product-check.txt` |

## Accesibilidad y consola

`axe` quedó sin violaciones en catálogo y carrito. En las superficies públicas restantes se conservaron violaciones existentes de contraste/landmarks/heading order documentadas por la matriz; no se atribuyen al diff de M10-03. La matriz también registra warnings de Clerk de desarrollo, hidratación/recursos abortados propios de la navegación rápida del servidor dev. El producto y `/faq` no reproducen errores de aplicación en las visitas aisladas posteriores al build.

## Criterio de diseño

- Atractivo: sí; la referencia mantiene jerarquía técnica y el panel comercial gana prioridad.
- Eficiente: sí; precio/estado, cantidad y CTA están juntos en el primer viewport.
- Responsive: sí; la composición móvil conserva galería y CTA fijo sin solapamiento.
- Fácil de usar: sí; el estado de cotización explica qué se confirma y la acción principal es inequívoca.

Resultado: `passed`.
