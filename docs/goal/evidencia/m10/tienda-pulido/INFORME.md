# M10-03 — Tienda, pulido

Estado: implementado en `wt/m10-03`; no se creó commit.

Runtime de evidencia: `corepack pnpm exec dotenv -e .env.localdb -- next dev --port 3006 --webpack` en `http://localhost:3006`. No se usó `3003`, `.env.local`, `proxy.ts` ni Neon.

## Resultado por punto del brief

1. **Identidad técnica limpia.** Se retiró `Estado fuente: ...` de `TechnicalIdentity`; SKU, marca, categoría y familia siguen visibles como metadatos comerciales separados.

2. **Estado comercial único.** Los productos sin precio o `on-request` muestran una sola etiqueta `Bajo consulta`, `Precio por cotización` y `Precio y disponibilidad se confirman al cotizar.`. El botón principal es `Solicitar cotización`; carrito queda explícitamente deshabilitado como `Solo cotizable`.

3. **Descripción honesta.** Se eliminó el filler de familia, incluido el texto legado persistido en la fila local. El fallback usa únicamente aplicación y, cuando existe, código de modelo: `Repuesto para ... Verifica el código ... antes de comprar.`. No se inventan compatibilidades.

4. **Caja transaccional above-the-fold.** La caja se mueve inmediatamente debajo de la identidad en la columna derecha; incluye estado/precio, explicación, cantidad, CTA y WhatsApp. En 1920 × 1080 quedó en `top=562`, `bottom=1042`.

5. **Unidad comercial centralizada.** Se creó `src/lib/unit-of-measure.ts`; `UNIDAD (BIENES)` y `NIU` se muestran como `Unidad`, con cobertura de códigos frecuentes y prueba del view-model.

6. **Responsive móvil.** La barra fija cambia a `Solicitar cotización` para el caso quote-only y mantiene el contenido accesible. En 390 × 844 ocupa `y=771..844`; no cubre la galería ni el contenido superior.

7. **Copy y flujo de cotización.** Se corrigieron acentos en cotización, búsqueda, catálogo, cuenta y estados públicos. Se añadió `scripts/storefront-copy.test.mjs`. El journey navegador fue: buscar `capacitor` → abrir ficha → agregar a cotización → abrir `/cotizacion` → enviar nombre `Jean QA M10-03` y teléfono `999999999` → confirmación.

8. **404.** Se retiró `Imagen referencial` únicamente de la ilustración 404. El badge de la galería de producto se conserva, porque sí describe una imagen de referencia comercial.

9. **Matriz pública.** Se revisaron `/carrito`, `/catalogo`, `/categoria/refrigeracion`, `/contacto`, `/faq`, `/nosotros` y `/libro-de-reclamaciones` en 1920 × 1080 y 390 × 844. Las capturas están en `final-routes/`; las visitas aisladas de categoría, `/faq` y producto están en `focused-product-check.txt`.

## Evidencia funcional y de datos

- Producto desktop final: `final-clean/after-producto-capacitor-25-µf-450-v-coldpower-check-1920x1080.png`.
- Producto móvil final: `after-producto-capacitor-25-µf-450-v-coldpower-390x844.png`.
- Journey completo: `final-journey/after-journey-search-1920x1080.png`, `after-journey-product-1920x1080.png`, `after-journey-quote-added-1920x1080.png`, `after-journey-cotizar-1920x1080.png`, `after-journey-confirmation-1920x1080.png`.
- Verificación SQL de `quotes`, `quote_items` y `quote_status_history`: `sql-journey.txt`.
- Matriz de controles visuales, responsive y honestidad de datos: `QA-INVENTARIO.md`.

## Validación automatizada

| Comando | Resultado |
| --- | --- |
| `corepack pnpm exec tsc --noEmit` | PASS, código 0 |
| `corepack pnpm lint` | PASS, código 0, 0 errores y 0 warnings reportados |
| `corepack pnpm exec tsx --test scripts/catalog-view-model.test.ts scripts/compatibility-safety.test.ts` | PASS, 5/5 |
| `corepack pnpm exec node scripts/storefront-copy.test.mjs` | PASS |
| `corepack pnpm exec node scripts/phase19-product-detail.test.mjs` | PASS |
| `corepack pnpm build` | PASS; compilación, TypeScript, páginas estáticas y optimización completadas |
| `corepack pnpm test:all` | Los grupos del proyecto pasan; el comando termina 1 por 1 prueba de inventario que no puede abrir el workbook externo requerido |
| `corepack pnpm test:inventory` | 19/20; único fallo: `ENOENT` para `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx` |

El workbook faltante es una dependencia externa del entorno, no se sustituyó ni se inventaron sus 1,348 filas. El resto de contratos de inventario ejecutados por `test:all` pasa.

## Riesgos y límites conocidos

- `axe` mantiene hallazgos preexistentes en contacto, FAQ, nosotros, libro, 404 y el landmark complementario de producto/cotización; M10-03 no los amplió.
- La matriz rápida conserva `ERR_ABORTED`, warnings de Clerk y un caso transitorio de desarrollo durante navegación consecutiva. Las visitas aisladas finales de producto y FAQ son `200` y no muestran error de aplicación.
- El home es espejo y queda fuera del diff. No se tocó ningún archivo de Home.

Resultado M10-03: `passed`, con la salvedad ambiental explícita del workbook externo para `test:all`/`test:inventory`.
