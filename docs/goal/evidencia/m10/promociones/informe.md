# Informe breve M10-01 — Admin / Promociones (revisión Claude)

## Entrega

- Workspace server-backed para métricas, calendario, cola, filtros URL, detalle y formulario.
- Preflight real en `src/app/api/admin/promociones/preview/route.ts`.
- Fixture idempotente protegida contra producción en `scripts/fixtures/promotions-dev.ts`; ejecutada y limpiada.
- La fixture preexistente `Fixture visual Home Espejo` quedó intacta por no pertenecer a este ticket.
- Sin cambios a `AdminShell`, `proxy.ts`, `.env.local`, Neon, reglas de precios/descuentos ni commit.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| `corepack pnpm exec tsc --noEmit` | PASS |
| `corepack pnpm exec eslint` sobre módulo Promociones | PASS, 0 errores / 0 warnings |
| `corepack pnpm exec eslint --ignore-pattern docs/goal/designs/m10-lote2/lamina/**` | PASS, 0 errores / 0 warnings |
| `corepack pnpm exec dotenv -e .env.localdb -- tsx --test scripts/cp048-promotions.test.ts` | PASS, 7/7 |
| `corepack pnpm test:all` | 19/20; único fallo: workbook externo ausente |
| `corepack pnpm exec dotenv -e .env.localdb -- next build` | PASS |
| Browser 1920 × 1080 / 390 × 844 | PASS visual e interactivo |
| Axe | 0 violations |
| Recorrido UI + SQL + auditoría | PASS; limpieza QA completada |

`corepack pnpm lint` global queda condicionado por archivos `.cjs` no versionados y preexistentes en `docs/goal/designs/m10-lote2/lamina/` (`require()` prohibido por la configuración ESLint). El lint del módulo y el checkout excluyendo únicamente esa carpeta pasan 0/0; no se modificaron esos artefactos ajenos.

El único fallo de `test:all` es `scripts/inventory-import.test.mjs`, que no puede abrir `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`. No se creó un sustituto porque ese workbook es la fuente canónica externa del catálogo.

Evidencia completa: [comparacion.md](./comparacion.md), [console.md](./console.md), [axe.md](./axe.md) y [recorrido.md](./recorrido.md).
