# M10-05 — Mi cuenta

## Resultado

Implementación de Mi cuenta con shell real de la tienda, navegación compartida y vistas de hub, pedidos, cotizaciones, pagos, historial y datos. La UI usa datos autenticados y consultas con ownership server-side; no se añadieron datos comerciales inventados.

La fixture local `[DEV] M10-05 account ownership` enlaza de forma idempotente el cliente previamente huérfano `cp-dashboard-v5-customer-013` al usuario de desarrollo con pedidos. Está protegida para host local, requiere `CP_DEV_AUTH_BYPASS=true` y no puede ejecutarse en producción.

## Capturas

| Vista | Desktop 1920 | Mobile 390 |
|---|---|---|
| Hub con datos | [PNG](./hub-datos-1920.png) | [PNG](./hub-datos-390.png) |
| Hub vacío | [PNG](./hub-vacio-1920.png) | [PNG](./hub-vacio-390.png) |
| Pedidos | [PNG](./pedidos-1920.png) | [PNG](./pedidos-390.png) |
| Cotizaciones | [PNG](./cotizaciones-1920.png) | [PNG](./cotizaciones-390.png) |
| Pagos | [PNG](./pagos-1920.png) | [PNG](./pagos-390.png) |

La comparación contra las láminas está en [comparacion.md](./comparacion.md). Las diferencias de contenido responden únicamente a datos reales disponibles en la base local y a que Company Settings no tiene WhatsApp configurado; por ello el CTA de WhatsApp se omite correctamente.

## Accesibilidad, consola y aislamiento

- Axe: 0 violaciones en hub con datos y hub vacío; detalle en [axe-consola.md](./axe-consola.md).
- Consola: 0 errores de aplicación en las rutas verificadas; queda únicamente la advertencia informativa de Clerk sobre claves de desarrollo.
- Aislamiento UI/API entre el usuario con datos y el usuario vacío: [aislamiento.md](./aislamiento.md).
- Validación manual en navegador personal autenticado a 1920×1080 y 390×844, incluyendo navegación, `Ver mis datos`, estados vacío/datos y navegación mobile.

## Verificación técnica

| Comprobación | Resultado |
|---|---|
| `corepack pnpm exec tsc --noEmit` | PASS |
| `corepack pnpm lint` | PASS — 0 errores, 0 warnings |
| Pruebas focalizadas de cuenta/portal | PASS — 7/7 |
| `corepack pnpm test:all` | 78/81 — 3 contratos históricos fallan fuera del diff |
| `corepack pnpm build` | PASS |

Los tres fallos de `test:all` son contratos antiguos que buscan `ProductCommercialEditor`, `Cantidad cotizada` y `Conversión` dentro de `src/app/admin/catalogo/productos/[id]/page.tsx`; la página vigente usa `ProductDetailWorkspace`. No se añadieron strings decorativos ni se alteró esa página para satisfacer contratos obsoletos.

El servidor de desarrollo de este worktree fue apagado y el puerto 3006 quedó sin listener.

## Revisión Claude — corrección de atención

- `COT-2026-019` (`CONVERTED`, vencida) y `COT-2026-040` (`ACCEPTED`) dejaron de contar como atención y badge.
- La regla compartida acepta únicamente `SENT`/`FOLLOW_UP` vigentes en fecha Lima; pagos y pedidos excluyen vencidos, cancelados y entregados.
- El plural del menú ahora es `1 respondida` / `2 respondidas`; el enlace administrativo solo vive en el menú personal.
- Revalidación GPU Playwright: [desktop](./hub-revision-1920x1080.png), [mobile](./hub-revision-390x844.png), [revalidation.json](./revalidation.json).
