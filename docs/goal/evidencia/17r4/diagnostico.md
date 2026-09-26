# R4 — Diagnóstico y medición de rendimiento

Fecha: 2026-09-25  
Checkout: `codex/goal-impecable`, `c0575b26` (`d9ead76` es ancestro).  
Base: PostgreSQL 18 local en `127.0.0.1:5433`, cargada mediante `.env.localdb`. No se usó Neon ni `.env.local` como fuente de configuración. No hubo commit.

## Alcance y controles

Se leyeron antes de actuar, en el orden pedido, `docs/goal/ORQUESTACION.md` (incluida §8 GPU), `docs/goal/META-10.md` y `docs/goal/briefs/17-R4-rendimiento.md` con su añadido final. No se modificó `proxy.ts`, no se retiró ni difirió `ClerkProvider` y no se cambió la composición visual del Home.

El snapshot inicial solicitado fue `Get-Process codex,agy,node -ErrorAction SilentlyContinue`: no apareció ningún proceso `agy`; había tres procesos `codex` (PIDs 4256, 15784 y 24664) y varios `node`. Los nodos más pesados del primer snapshot fueron PID 932 (~493 MB) y PID 21980 (~358 MB). La inspección posterior de líneas de comando no encontró otro `next dev`; los procesos correspondían a runtimes de Codex/MCP/CUA/Playwright. No se mató ningún proceso ajeno. Al cierre no quedó ningún listener en `3003` ni ningún `node` con comando `next dev`.

Tras la reanudación por la interrupción de autenticación apareció un proceso `agy` (PID 8996, ~481 MB) y un `node` de ~334 MB (PID 15780); una inspección de comandos siguió sin encontrar `next dev`. No se mataron. Las mediciones R4 ya habían terminado antes de esa aparición; no se repitieron para no presentar como aisladas unas corridas contaminadas por ese estado externo.

El build y el servidor se ejecutaron con:

```text
corepack pnpm exec dotenv -e .env.localdb -- next build
corepack pnpm exec dotenv -e .env.localdb -- next start --port 3003
```

El build final terminó correctamente con Next.js 16.2.9, Turbopack, TypeScript y generación de 144 páginas. Next muestra `Environments: .env.local` en su salida estándar por su cargador automático; el comando se lanzó explícitamente con `dotenv -e .env.localdb` y no se leyó ni modificó `.env.local`.

## TTFB sin throttling

Se ejecutaron diez solicitudes por URL con `curl.exe --noproxy '*' -o NUL -s -w '%{time_starttransfer}'`. La primera fila es la línea base antes del cambio; la segunda es la repetición con el artefacto final.

| URL | Muestras antes (s) | Mediana antes | P90 antes | Mediana después | P90 después |
|---|---|---:|---:|---:|---:|
| `/` | 0.112873, 0.007175, 0.005588, 0.006017, 0.005509, 0.007119, 0.005083, 0.005802, 0.005268, 0.005816 | 0.005810 | 0.007175 | 0.005710 | 0.006840 |
| `/catalogo` | 0.223565, 0.016190, 0.011916, 0.011168, 0.014338, 0.012040, 0.014140, 0.012497, 0.012416, 0.011882 | 0.012460 | 0.016190 | 0.013923 | 0.025273 |
| `/producto/tarjeta-lg-con-cable-6871jb1103h` | 0.020543, 0.010119, 0.009550, 0.010439, 0.013123, 0.011143, 0.010049, 0.009616, 0.011049, 0.009417 | 0.010281 | 0.013123 | 0.010337 | 0.010980 |

Conclusión: el servidor local no explica por sí solo el LCP simulado de 5–8 s. Después del primer request, el TTFB real se mantiene en aproximadamente 6–14 ms.

## Consultas del render

Para aislar el coste de datos se añadió temporalmente un logger de Drizzle detrás de `COLDPOWER_DB_DIAGNOSTICS=1`, sin registrar parámetros. Se recompiló, se capturaron los logs y se revirtió/eliminó el helper y el logger al terminar; la variable no quedó encendida.

| Ruta | Consultas | Contexto | Tiempo total | Consulta más lenta |
|---|---:|---|---:|---:|
| Home | 15 | Render equivalente de `loadCatalogHomeData` + CMS + settings durante prerender | 483.67 ms | 70.45 ms |
| Home | 0 | GET en runtime: la página quedó estática/prerenderizada | 0 ms | 0 ms |
| Catálogo | 14 | GET real en `next start` | 632.13 ms | 126.60 ms |
| Ficha | 8 | GET real en `next start` | 277.51 ms | 111.41 ms |

Evidencia de los renders instrumentados: `diagnostic-home-build-render.log`, `diagnostic-home-server.log`, `diagnostic-catalogo-server.log` y `diagnostic-producto-server.log`.

## Primera carga: JS, CSS y fuentes

Lighthouse fue `npx lighthouse@latest` 13.5.0. Cada URL tuvo tres corridas con:

```text
--preset=perf --form-factor=mobile --throttling-method=simulate
--chrome-flags="--headless=new --enable-gpu --use-angle=d3d11 --ignore-gpu-blocklist"
```

Los nueve JSON válidos están en esta carpeta como `baseline-lighthouse-*.json` y `after-lighthouse-*.json`. En Windows cada ejecución terminó con `EPERM` al borrar `C:\Users\jean_\AppData\Local\Temp\lighthouse.*`; el JSON ya había sido escrito y se verificó su contenido. Este fallo de limpieza explica el código de salida `1`, no una ausencia de medición.

En las tres rutas el trace cargó 23 recursos JavaScript en total: 17 del aplicativo (~260–263 KiB de transferencia) y 6 de Clerk (~367 KiB). El total de `resource-summary` fue ~627–630 KiB. Clerk se conserva en el camino permitido por el brief. La evaluación de scripts antes/después (mediana aproximada, ms) fue:

| Ruta | Script evaluation antes | Script evaluation después |
|---|---:|---:|
| Home | 719.7 | 730.8 |
| Catálogo | 653.1 | 652.9 |
| Ficha | 655.8 | 632.9 |

El CSS fue 2 hojas y ~38.8 KiB antes / ~38.6 KiB después. `unused-css-rules` reportó `overallSavingsBytes=0` en las nueve mediciones; no había una eliminación segura de CSS justificada por el trace.

Antes se solicitaban 5 fuentes (~81 KiB), todas con prioridad alta y preload; `font-display` fue `swap`. Después se solicitaron 4 (~70.7 KiB). La única corrección aplicada fue retirar el peso `500` de `IBM_Plex_Mono` en `src/app/layout.tsx`: la búsqueda de clases no encontró uso conjunto de `font-mono` y `font-medium`. La guía vigente de Next 16 confirma que cada peso declarado por `next/font` se autoaloja y genera su propio recurso.

## LCP y diagnóstico

Los elementos LCP se mantuvieron estables:

| Ruta | Elemento LCP |
|---|---|
| Home | `main#main-content > section.home-hero > picture.home-hero-picture > img.home-hero-image` |
| Catálogo | `section.bg-surface-page > div.cp-container > section.relative > img.-z-20` |
| Ficha | `section.mt-7 > div.space-y-4 > div.relative > img.object-contain` |

El hero del Home ya tenía `fetchpriority="high"`, era descubrible y no lazy. No se tocó su arte, composición ni prioridad. `lcp-discovery-insight` pasó en Home; para catálogo y ficha el audit no marcó la misma condición, pero sus retrasos de carga de recurso fueron secundarios frente al render/hidratación.

Medianas del desglose de Lighthouse (ms), siempre en el orden TTFB / load delay / load time / render delay:

| Ruta | Antes | Después |
|---|---|---|
| Home | 508.0 / 10.1 / 17.2 / 154.0 | 490.4 / 9.7 / 16.3 / 2076.4 |
| Catálogo | 548.0 / 92.9 / 3.0 / 236.4 | 631.8 / 88.9 / 4.1 / 246.7 |
| Ficha | 502.0 / 95.8 / 11.5 / 254.3 | 545.1 / 85.8 / 3.7 / 260.6 |

En algunos JSON de Lighthouse 13 las cuatro subpartes no suman exactamente el audit `largest-contentful-paint`, debido al modelado de redirects/trazas de Chrome; se conservaron los valores emitidos y no se inventó una suma corregida. El resultado principal es claro: la reducción de una fuente ahorra ~10.3 KiB y un request, pero no corrige el render delay/hidratación que domina el Home bajo `simulate`. Por eso no se aplicó un `dynamic()` especulativo ni se alteraron proveedores, Clerk o composición visual.

## Medición posterior y límites

El cambio fue técnicamente seguro y medible, pero no alcanza las metas del brief por sí solo. La mediana de Performance/LCP/FCP/TBT/CLS quedó así:

| Ruta | Antes | Después | Lectura |
|---|---|---|---|
| Home | 71 / 6562.2 / 2834.6 / 120 / 0 | 65 / 7660.5 / 3327.1 / 99 / 0 | CLS/TBT cumplen; LCP y Performance no |
| Catálogo | 77 / 5128.5 / 2573.8 / 40 / 0 | 77 / 5141.4 / 2401.6 / 44.5 / 0 | FCP mejora; LCP no llega a 2.5 s |
| Ficha | 77 / 5224.7 / 2543.4 / 79 / 0 | 76 / 5626.1 / 2559.2 / 61 / 0 | CLS/TBT cumplen; LCP y Performance no |

El aumento del Home es ruido de ejecución del render delay entre corridas, no una regresión visual atribuida al peso eliminado. Las metas pendientes requieren una iteración específica de hidratación/Clerk/CPU con cobertura autenticada; esas acciones están expresamente fuera de los límites de R4.

## Humo y verificación

- `r4-routes-smoke` con `GPU_ARGS`: Home, catálogo y ficha en `1920×1080` y `390×844`, títulos correctos, 0 errores de consola y 0 errores de página. Los `net::ERR_ABORTED` registrados son prefetch RSC cancelados al navegar y quedan conservados en [`smoke/r4-routes-smoke/result.json`](smoke/r4-routes-smoke/result.json).
- `scripts/qa/b-1-1-quote.mjs`: el tramo público persistió la cotización local de QA (`CP-20260925-8AZB`), pero el tramo staff quedó bloqueado porque el contexto headless no tenía sesión Clerk y no apareció `Editar`.
- `scripts/qa/r3-auth-navigation.mjs`: bloqueado de forma reproducible por ausencia de `QA_STORAGE_STATE`; `Mi cuenta` mostró `Ingresar` y la navegación fue a `sign-in`.
- Para hacer compatibles los smoke actuales con los labels reales se corrigieron únicamente los selectores de test `Nombre o razón social` y `Teléfono` en ambos scripts; no se cambió la UI.
- `corepack pnpm exec tsc --noEmit`: OK.
- `corepack pnpm lint`: OK, 0 errores / 0 warnings.
- `corepack pnpm test:all`: todos los grupos pasaron salvo el único test que requiere el Excel externo ausente `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`; el error fue exclusivamente `ENOENT` de ese artefacto permitido.
- `corepack pnpm exec dotenv -e .env.localdb -- next build`: OK.

El servidor de medición fue apagado al finalizar; el puerto `3003` quedó libre.
