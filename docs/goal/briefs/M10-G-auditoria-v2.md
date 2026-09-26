# M10-G — Re-auditoría v2 independiente (Gemini, subjefe, SOLO LECTURA)

Eres el auditor independiente. El jefe es Claude. Tu trabajo es **encontrar lo que todavía no llega a 10/10** en ColdPower, con evidencia.

## Reglas (se invalida el informe si se rompen)
- **Solo lectura:** no edites nada de `src/`, `scripts/` ni la configuración. Escribe solo en `docs/goal/usabilidad/gemini/v2/`.
- **Cero escrituras en la base:** nada de INSERT, UPDATE ni DELETE, ni llamadas a servicios internos (`@/lib/*-service`). Tampoco crees datos por la API. Solo **navegas la UI** (Playwright: `goto`, `click` para abrir drawers o pestañas, `hover`) y haces **SELECT** de lectura.
  - En tu auditoría anterior probaste escribiendo directo en la base: eso **no vale**.
- **Servidor en ESTA carpeta** (`C:/Users/jean_/Desktop/COLDPOWER-audit`), puerto **3005**:
  ```
  corepack pnpm exec dotenv -e .env.localdb -v CP_DEV_AUTH_BYPASS=true -v CP_DEV_AUTH_USER_ID=user_3HsX8RHS2xwA0sPrSpXAe5SdDOO -v CP_DEV_AUTH_ALLOWED_HOSTS=localhost:3005 -- next dev --port 3005 --webpack
  ```
  - Navega **solo** a `http://localhost:3005`.
  - Para la tienda sin sesión, las rutas públicas funcionan igual.
  - Para `/cuenta`, reinicia con un usuario cliente: busca uno con `SELECT` sobre `users`/`customers`.
- **Playwright con GPU:** `chromium.launch({ headless: true, args: ["--enable-gpu","--use-angle=d3d11","--ignore-gpu-blocklist"] })`. Instala Playwright solo dentro de `docs/goal/usabilidad/gemini/v2/runtime/`.
- **Nunca** `.env.local` ni Neon. Otros puertos (3003, 3006) no son tuyos.

## Qué auditar
Todas las superficies de `docs/goal/META-10.md` §2 y §4b:
- **22 del admin:** incluidos Promociones, Taxonomía, detalle de producto, proveedor y Configuración, que son nuevos;
- **unas 20 de la tienda y la cuenta:** incluida la nueva Mi cuenta.

Captura cada una a **1920×1080 y 390×844**.

Puntúa cada superficie de 0 a 10 con la **rúbrica de META-10 §1** (10 criterios) y el lenguaje del admin de §3. Busca en especial:
- espacios muertos o paneles estirados;
- textos internos visibles (enums, códigos, "mock");
- inconsistencias de datos entre pantallas (el mismo número distinto en dos lugares);
- faltas de ortografía o tildes;
- desbordes a 390 (`scrollWidth` > `clientWidth`);
- errores de consola;
- estados vacíos, de error o de carga pobres;
- botones sin acción;
- contraste;
- foco de teclado.

## Entregable
`docs/goal/usabilidad/gemini/v2/informe.md`:
- **Tabla:** superficie | nota | defectos (cada uno con captura, pasos y archivo:línea si lo ubicas) | severidad P0–P3.
- **Sección "Lo que sí está en 10".**
- **Resumen** con la nota media y la lista priorizada de lo que impide el 10.

Un informe sin defectos es sospechoso: busca a fondo. Al terminar, **apaga tu servidor**.
