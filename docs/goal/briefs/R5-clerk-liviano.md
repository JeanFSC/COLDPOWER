# R5 — Clerk liviano en las páginas públicas (rendimiento móvil sin romper la sesión)

Protocolo: `docs/goal/ORQUESTACION.md`, incluida la §8 GPU. Contexto medido en R4 (`docs/goal/evidencia/17r4/diagnostico.md`):
- las páginas públicas cargan unos 630 KiB de JS, de los cuales **unos 367 KiB son de Clerk**;
- el servidor responde en 6–14 ms;
- el LCP móvil simulado es de 5–7,6 s y la meta es ≤ 2,5 s.

## Qué se rechazó antes y por qué (NO repetir)
En R3b se revirtió un `DeferredClerkProvider`, porque rompía:
- el estado de sesión en páginas públicas;
- la navegación a `/cuenta`;
- los formularios, que se borraban al remontar el árbol;
- la renovación del token.

**Cualquier solución debe conservar la sesión funcionando en todo el sitio.**

## Estrategia a evaluar (en orden)
1. **Variante headless de Clerk en el grupo público.**
   - Verifica en `node_modules/@clerk/nextjs` y en su documentación de la versión instalada si `ClerkProvider` acepta `clerkJSVariant="headless"`, o su equivalente, para cargar clerk-js sin componentes de UI.
   - Mueve las rutas a **route groups**, sin cambiar las URLs:
     - `src/app/(public)/`: home, catalogo, categoria, buscar, producto, comparar, contacto, nosotros, faq, legales y libro-de-reclamaciones. Provider con la variante **headless**.
     - `src/app/(app)/`: cuenta, carrito, checkout, cotizacion, pago, sign-in, sign-up, auth, admin y dashboard. Provider **completo** (necesitan los componentes de UI de Clerk).
   - El `layout.tsx` raíz conserva `<html>`, las fuentes, los estilos y los proveedores no-Clerk. Cada grupo monta su propio `ClerkProvider`, con las mismas props de hoy: redirects, localización y URLs de sign-in y sign-up.
   - `Header` y `MobileMenu` en el grupo público usan solo hooks o componentes de estado de sesión (compatibles con headless). El botón "Ingresar" es un **enlace** a `/sign-in`, no un modal.
2. **Solo si headless no existe o no reduce el peso**, propón a Claude, SIN implementarla, una alternativa con su análisis de riesgos, y detente.

## Pruebas obligatorias (la tarea no está terminada sin ellas)
Con Playwright y GPU_ARGS, contra `next build && next start`:
- **a)** Un cliente **con sesión** en home, catálogo y ficha ve "Mi cuenta", no "Ingresar". Usa un `storageState` de sesión real o el bypass de desarrollo si aplica. Si no puedes obtener una sesión Clerk en headless, documenta el bloqueo y prueba con el bypass.
- **b)** Navegar sin recargar de la ficha a `/cuenta` y a `/carrito` conserva la sesión.
- **c)** Agregar al carrito desde la ficha tras **más de 70 s de inactividad** (token vencido) guarda en el carrito del usuario, no en uno de invitado.
- **d)** Formulario de cotización a medio llenar, interacción con el header: el formulario no se borra.
- **e)** Sign-in y sign-out funcionan. El home es **idéntico visualmente**, porque es espejo: compara las capturas a 1920 y 390.
- **f)** Rutas de `/admin` y `/cuenta` sin cambios de permisos. `proxy.ts` **no se modifica**.

## Medición
- Mismo método que R4: `next build` + `next start`, Lighthouse `simulate` en móvil, 3 corridas, mediana, Chromium con GPU. Home, catálogo y ficha.
- Tabla antes/después en `docs/goal/usabilidad/rendimiento.md` y KiB de JS de Clerk antes/después.

## Entorno
- Worktree `C:/Users/jean_/Desktop/COLDPOWER-r5` (rama `wt/r5`).
- `next dev` en el puerto **3006**; `next start` para medir en el **3007**.
- El puerto 3002 es de Jean: **no lo toques**.
- `.env.localdb`. Prohibido: `.env.local`, `proxy.ts` y Neon.

## Terminado =
- Pruebas a–f PASS con evidencia en `docs/goal/evidencia/r5/`.
- Medición antes/después.
- `tsc`, lint 0/0, `test-all` (solo el Excel externo) y build.
- Commit en `wt/r5` con el mensaje `perf(r5): lightweight Clerk on public pages` y el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Apaga tus servidores.
