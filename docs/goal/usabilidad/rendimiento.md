# Rendimiento — QA final local

Fecha: 2026-09-24  
Base: PostgreSQL 18 local en `127.0.0.1:5433`, `.env.localdb`; nunca Neon.  
Artefacto: `next build` servido con `next start` en `3003`, con bypass de desarrollo únicamente para permitir el usuario fixture durante QA.

## Criterios

Metas del brief: LCP < 2,0 s, CLS < 0,05 y Performance ≥ 90. Se ejecutó Lighthouse 12.8.2 sobre home, catálogo y ficha, en escritorio y móvil 390×844. No existía una captura Lighthouse comparable anterior; por eso la columna “antes” es N/D y no se inventa una regresión histórica.

## Lighthouse

| Ruta / viewport | Antes | Después: Performance | LCP | CLS | Meta | Evidencia |
|---|---:|---:|---:|---:|---|---|
| Home / desktop 1920 | N/D | 0.95 | 1.434 s | 0.0000 | ✅ | [`lighthouse-home-desktop-final.json`](../../output/qa-final-local/lighthouse-home-desktop-final.json) |
| Home / móvil 390 | N/D | 0.77 | 5.159 s | 0.0000 | ❌ LCP/Performance | [`lighthouse-home-mobile-final.json`](../../output/qa-final-local/lighthouse-home-mobile-final.json) |
| Catálogo / desktop 1920 | N/D | 0.76 | 1.504 s | 0.4000 | ❌ Performance/CLS | [`lighthouse-catalogo-desktop-after-fix.json`](../../output/qa-final-local/lighthouse-catalogo-desktop-after-fix.json) |
| Catálogo / móvil 390 | N/D | 0.63 | 5.152 s | 0.2488 | ❌ Performance/LCP/CLS | [`lighthouse-catalogo-mobile-after-fix.json`](../../output/qa-final-local/lighthouse-catalogo-mobile-after-fix.json) |
| Producto / desktop 1920 | N/D | 0.78 | 1.221 s | 0.4000 | ❌ Performance/CLS | [`lighthouse-producto-desktop-after-fix.json`](../../output/qa-final-local/lighthouse-producto-desktop-after-fix.json) |
| Producto / móvil 390 | N/D | 0.64 | 5.047 s | 0.2488 | ❌ Performance/LCP/CLS | [`lighthouse-producto-mobile-after-fix.json`](../../output/qa-final-local/lighthouse-producto-mobile-after-fix.json) |

Las comprobaciones Lighthouse de accesibilidad quedaron en 1.00 en las ejecuciones finales de home, catálogo y producto; SEO fue 1.00 en home y catálogo y 0.92 en producto. Las imágenes no dejaron ahorro de imágenes responsive relevante en las ejecuciones revisadas.

## Hallazgos

- P1/P2 de rendimiento: Lighthouse atribuye el CLS repetido a `body.flex > footer.home-footer`; catálogo y producto alcanzan 0.2488 móvil y 0.4000 desktop. Una observación de rendimiento durante una transición cliente también registró el cambio de geometría del footer. Debe investigarse la hidratación/layout del footer antes de declarar la meta cumplida; no se aplicó un parche especulativo.
- P1 de móvil: LCP de 5,0–5,2 s y Performance 0.63–0.77 en catálogo, producto y home. La meta de 2 s no queda cumplida.
- El home no se rediseñó. Solo recibió ajustes puntuales de contraste, color y legibilidad permitidos por el brief.
- No se obtuvo una medición comparable de tiempo de respuesta por módulo admin; la QA comprobó carga funcional, consola y RBAC, pero no dejó un perfil de latencia server-side con p95.

## Build y límites de compilación

El artefacto QA compiló con `.env.localdb` y se sirvió en 3003. La validación estricta de TypeScript no pudo cerrar porque el archivo concurrente no versionado [`audit-rigor.ts`](../../docs/goal/usabilidad/gemini/audit-rigor.ts:153) usa `inventoryBalances.available` y el estado `DISPATCHED`, inexistentes en el esquema vigente. Para obtener el artefacto visual se habilitó temporalmente `typescript.ignoreBuildErrors` en `next.config.ts`, se compiló y se restauró el archivo byte a byte; esa excepción no se dejó en el código.

La advertencia de Next sobre `NODE_ENV=development` es del harness del bypass local, no un modo de despliegue recomendado. No se usó 3000, 3002, 3007 ni Neon.

## Prioridad recomendada

1. Reservar dimensiones/layout estable para el footer y repetir Lighthouse.
2. Medir y optimizar el camino crítico móvil (LCP), con captura antes/después por ruta.
3. Añadir medición de latencia por módulo admin y repetir en 768/1024/1440.

## Medición R2 posterior a correcciones mínimas

Se repitió Lighthouse 12.8.2 sobre Home en el artefacto de producción de 3003, con PostgreSQL 18 local y sin cambiar la composición aprobada. Las cifras anteriores son las que ya constaban en este informe; las nuevas evidencias están en `output/qa-final-local`.

| Ruta | Antes | R2 | Cambio | Resultado |
|---|---:|---:|---:|---|
| Home / desktop 1920 | Perf 0.95; LCP 1.434 s; CLS 0.0000 | Perf 0.97; LCP 1.205 s; CLS 0.0000 | LCP -0.229 s | ✅ cumple las tres metas |
| Home / móvil 390 | Perf 0.77; LCP 5.159 s; CLS 0.0000 | Perf 0.81; LCP 4.822 s; CLS 0.0000 | LCP -0.337 s | ❌ sigue sin cumplir Perf/LCP |

Evidencia: [`lighthouse-home-r2-desktop.json`](../../output/qa-final-local/lighthouse-home-r2-desktop.json) y [`lighthouse-home-r2-mobile.json`](../../output/qa-final-local/lighthouse-home-r2-mobile.json). En Windows Lighthouse escribió correctamente ambos JSON, pero terminó con `EPERM` al limpiar el directorio temporal de Chrome; por eso se conserva la métrica del artefacto y se reporta la salida no ideal del CLI.

Los cambios medidos fueron acotados: `picture` con fuentes desktop/mobile y dimensiones explícitas para el hero, logo principal prioritario, reserva mínima del main para reducir saltos, prioridad del hero de catálogo y sin preload de tarjetas fuera del primer viewport. El móvil sigue limitado por el camino de hidratación/Clerk y un retraso de render del LCP de aproximadamente 3.996 s; no se eliminó autenticación ni se degradó seguridad para perseguir una cifra sintética.

Las métricas previas de catálogo y producto permanecen como referencia no repetida en esta iteración; no se presentan como una mejora R2. El objetivo de rendimiento queda **parcialmente cumplido**: Home desktop aprobado, Home móvil y CLS de las rutas antiguas pendientes de una iteración específica con sesión autenticada y datos de media reales.

## Medición R3 — 390×844 en producción local

R3 repitió la comparación con `next build` y `next start --port 3003`, PostgreSQL local y Lighthouse 12.8.2 con throttling DevTools. Antes corresponde a la línea base R3 tomada antes de los cambios; después es la última corrida posterior a la compresión responsive del hero y al aplazamiento público de Clerk. Las cifras son una corrida comparable, no un promedio; Lighthouse fue ruidoso en TBT entre rutas.

| Ruta | Antes: Performance / LCP / FCP / TBT | Después: Performance / LCP / FCP / TBT | CLS | Resultado |
|---|---|---|---:|---|
| Home | 0.57 / 6.529 s / 4.948 s / 297 ms | 0.49 / 5.177 s / 4.516 s / 821 ms | 0.000 | LCP mejora 1.352 s; no alcanza 2.5 s |
| Catálogo | 0.62 / 5.821 s / 5.282 s / 182 ms | 0.40 / 5.859 s / 4.473 s / 1517 ms | 0.000 | FCP mejora; TBT ruidoso y LCP no mejora |
| Producto | 0.64 / 5.380 s / 4.866 s / 214 ms | 0.46 / 5.977 s / 4.674 s / 803 ms | 0.000 | No cumple LCP/Performance |

Cambios aplicados y verificados: `hero-mobile-390.webp` y `hero-mobile-780.webp` derivados del mismo arte aprobado, `srcset/sizes` para el hero, sin preload de IBM Plex Mono, `prefetchUI={false}` y carga diferida de Clerk en rutas públicas. El hero de Home pasó de 112 KB a 75 KB para el candidato DPR 2. El proveedor se mantiene inmediato en `/admin`, `/cuenta`, `/sign-in`, `/sign-up` y `/auth`; las rutas públicas muestran fallback mientras se aplaza la carga.

La traza final confirma que Clerk JS ya no entra en el camino del LCP público, pero `proxy.ts` sigue realizando el handshake de Clerk en el middleware (archivo fuera del alcance permitido) y el entorno local bajo throttling conserva un TTFB de LCP cercano a 2.1 s. Por eso R3 queda **parcialmente cumplido**: hay mejora objetiva y CLS 0 en las tres rutas, pero no se declara cumplimiento de LCP < 2.0 s ni Performance ≥ 90. Evidencia reproducible: [`result.json`](../../goal/evidencia/17r3/05-rendimiento/after/result.json), JSON Lighthouse, capturas PNG y SQL `sql-catalog-fixture.tsv`/`sql-final.tsv` del mismo directorio.

Lighthouse conserva la limitación conocida de Windows: algunas corridas generan el JSON válido y terminan con `EPERM` al limpiar el directorio temporal de Chrome. Se verificó `Get-Process codex,agy` antes de la medición; no se inició ningún agente adicional. El siguiente trabajo de rendimiento debe aislar el handshake del middleware y repetir varias corridas por ruta antes de tocar más la composición visual.

## Medición R4 — diagnóstico medido y fuente segura

R4 se ejecutó sobre `codex/goal-impecable` con `next build` y `next start --port 3003` usando `.env.localdb`, Lighthouse 13.5.0, `--preset=perf --form-factor=mobile --throttling-method=simulate` y Chromium GPU (`--headless=new --enable-gpu --use-angle=d3d11 --ignore-gpu-blocklist`). Cada URL tuvo tres corridas y esta tabla reporta la mediana. La evidencia detallada está en [`diagnostico.md`](../evidencia/17r4/diagnostico.md).

| Ruta | Antes: Performance / LCP / FCP / TBT / CLS | Después: Performance / LCP / FCP / TBT / CLS | Resultado |
|---|---|---|---|
| Home | 71 / 6.562 s / 2.835 s / 120 ms / 0.000 | 65 / 7.661 s / 3.327 s / 99 ms / 0.000 | CLS/TBT cumplen; LCP y Performance no |
| Catálogo | 77 / 5.129 s / 2.574 s / 40 ms / 0.000 | 77 / 5.141 s / 2.402 s / 44.5 ms / 0.000 | FCP mejora; LCP no llega a 2.5 s |
| Producto | 77 / 5.225 s / 2.543 s / 79 ms / 0.000 | 76 / 5.626 s / 2.559 s / 61 ms / 0.000 | CLS/TBT cumplen; LCP y Performance no |

El cambio aplicado fue mínimo: retirar el peso `500` de IBM Plex Mono, no usado por las clases `font-mono`, reduciendo las fuentes de 5 (~81 KiB) a 4 (~70.7 KiB). La reducción no resuelve el render delay/hidratación bajo `simulate`; no se tocaron Clerk, `proxy.ts`, el hero ni la composición del Home. La meta R4 queda **parcialmente cumplida** y las metas pendientes requieren una iteración de hidratación autenticada fuera de estos límites.

La verificación final fue `tsc` OK, `lint` 0/0, build OK y humo de rutas limpio en `1920×1080` y `390×844` con `GPU_ARGS`. `test-all` tuvo únicamente el fallo permitido por ausencia del Excel externo en `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`; el servidor quedó apagado.
