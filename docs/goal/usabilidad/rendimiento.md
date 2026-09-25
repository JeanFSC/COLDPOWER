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
