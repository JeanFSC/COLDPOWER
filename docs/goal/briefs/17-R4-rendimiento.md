# Brief 17-R4 — Rendimiento móvil basado en medición (Codex, orden de Claude)

Protocolo: `docs/goal/ORQUESTACION.md`. Carpeta principal y rama `codex/goal-impecable`. PG18 local en 5433 con `.env.localdb`. Sin Neon y sin commit.
**`proxy.ts` sigue PROHIBIDO.** Motivo de Claude:
- Con un navegador sin cookies (así mide Lighthouse), `clerkMiddleware` no hace llamadas de red; no explica un FCP de 4,5 s.
- El middleware borra en cada request las cabeceras de rol verificado (`VERIFIED_*`). Quitar rutas del matcher abre la puerta a falsificarlas y rompe `auth()` en esas rutas.

## Metodología obligatoria (sin datos no hay cambios)
1. **Servidor:** `corepack pnpm exec dotenv -e .env.localdb -- next build` y luego `next start --port 3003`. **Ningún otro agente corriendo** (verifícalo con `Get-Process codex,agy,node`; anota el resultado).
2. **Lighthouse CLI** con la configuración estándar de PageSpeed: `--preset=perf --form-factor=mobile --throttling-method=simulate`. Nota: R3 usó `devtools`, que es más severo y ruidoso. **Tres corridas por URL; reporta la mediana.** URLs: `/`, `/catalogo`, y la ficha `/producto/tarjeta-lg-con-cable-6871jb1103h`.
3. **Descomponer antes de tocar nada.** Deja la línea base en `docs/goal/evidencia/17r4/diagnostico.md`:
   - **TTFB del servidor:** `curl.exe -o NUL -s -w "%{time_starttransfer}"`, 10 veces por URL (sin throttling): mediana y p90.
   - **Consultas del render:** cuántas consultas a PostgreSQL hace cada página y cuánto tardan. Usa el logger de Drizzle **solo en local**, activado por una variable de entorno de diagnóstico que no quede encendida.
   - **JS de primera carga por ruta:** el reporte de `next build` y los chunks que carga la página según el trace de Lighthouse.
   - **CSS:** tamaño total y reglas no usadas (auditoría `unused-css-rules`).
   - **Fuentes:** cuántas se piden, pesos, `font-display` y preload.
   - **Elemento LCP:** cuál es por URL y el desglose de Lighthouse (TTFB / load delay / load time / render delay).
4. **Corregir solo lo que el desglose señale**, de mayor a menor impacto. Opciones típicas:
   - **Render delay alto:** menos JS de cliente arriba del pliegue (componentes `"use client"` innecesarios, `dynamic()` para lo que está bajo el pliegue, eliminar hidratación de secciones estáticas).
   - **Load delay alto:** `priority` / `fetchPriority` en la imagen LCP, `preload` correcto, sin lazy en la imagen LCP.
   - **TTFB alto:** paralelizar las consultas del render, `unstable_cache` o `revalidate` para datos públicos (catálogo o home), sin romper precios ni stock en vivo en la ficha.
   - **Fuentes:** reducir familias y pesos, usar `next/font` con `display: swap` y subsets.
5. **Medir después** con el mismo método: tabla antes/después con la mediana de 3 corridas en `docs/goal/usabilidad/rendimiento.md`.

## Límites
- **No** diferir Clerk ni quitar `ClerkProvider` (rechazado en R3b).
- **No** cambiar la composición visual del home: es un espejo de la referencia de Jean. Solo técnica de carga.
- **Metas:** LCP móvil ≤ 2,5 s (ideal ≤ 2,0 s), CLS < 0,05, TBT < 200 ms, en `simulate`. Si no se alcanzan con cambios seguros, reporta qué falta con números: por ejemplo, TTFB propio del hardware local frente a un despliegue en la nube.

## Verificación
- Recorridos de humo por UI para confirmar que nada se rompió:
  - `scripts/qa/b-1-1-quote.mjs`;
  - `r3-auth-navigation.mjs`;
  - home, catálogo y ficha sin errores de consola, a 1920 y a 390.
- `tsc`, lint 0/0, `test-all` (solo el Excel externo) y build.
- Informe con números. Sin commit.

## Añadido por Claude (2026-09-25)
- **Lighthouse CLI:** también con Chromium en GPU. Pasa `--chrome-flags="--headless=new --enable-gpu --use-angle=d3d11 --ignore-gpu-blocklist"` y documéntalo. Lighthouse `simulate` modela la red y la CPU de forma estándar, así que la GPU local no altera la comparación con PageSpeed.
- **Base actual:** ya incluye M10 (Promociones, lote 2, Mi cuenta y pulido). Mide las 3 URLs públicas: home, catálogo y ficha.
