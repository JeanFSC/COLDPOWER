# Protocolo de orquestación — ColdPower (vigente desde 2026-09-24)

Jerarquía:
- **Claude:** JEFE. Decide, ordena, revisa el código y hace los commits.
- **Gemini 3.8 Flash High (`agy`):** SUBJEFE y auditor independiente. **Solo lectura** sobre el código.
- **Codex (gpt-5.6-luna):** PROGRAMADOR. Solo obedece a Claude.

Este protocolo corrige los errores detectados el 24/09. Cada regla existe por un fallo real.

## 1. Órdenes (todas las de Codex y Gemini)
Cada orden incluye **explícitamente**:
- **Comandos exactos** con variables, puertos y flags. Ejemplo de servidor por rol:
  `corepack pnpm exec dotenv -e .env.localdb -v CP_DEV_AUTH_BYPASS=true -v CP_DEV_AUTH_USER_ID=<fixture> -v CP_DEV_AUTH_ALLOWED_HOSTS=localhost:<puerto> -- next dev --port <puerto> --webpack`
- **URLs exactas.** Navegar SIEMPRE a `http://localhost:<puerto>`, nunca a `127.0.0.1`: el bypass exige una coincidencia exacta del host (`src/lib/dev-auth-bypass.ts:27`); con otro host Clerk responde 500 `dev-browser-missing`.
- **Herramientas y cómo usarlas.**
  - Playwright desde `node_modules` (`chromium.launch({ headless: true })`), con los scripts en `scripts/qa/*.mjs` (**crearlos** si no existen).
  - psql en `C:\PostgreSQL\18\bin\psql.exe -h 127.0.0.1 -p 5433 -U coldpower -d coldpower`.
- **Nombres reales de tablas y archivos** relevantes. Leer primero `src/db/*.ts` antes de escribir SQL de verificación.
- **Trampas conocidas** con su solución.
- **Pasos en orden** y **definición de "terminado"**.
- **Prohibiciones fijas:**
  - no tocar `.env.local` ni `proxy.ts`;
  - nunca Neon;
  - sin commit;
  - no editar contratos de prueba sin justificarlo por escrito;
  - no sustituir la tarea por otra más fácil.
- **Prompts extensos de Jean:** van íntegros, palabra por palabra, con su imagen de referencia adjunta (`-i`).

## 2. Pruebas de uso (QA)
- **"Recorrido" = interacción real por la UI** (Playwright: goto, click, fill), con el rol correcto. Llamar servicios o escribir directo en la base **no cuenta** como recorrido. Esa verificación se reporta aparte como "verificación de servicio".
- Escribir directo en la base solo está permitido para **preparar fixtures** documentadas, nunca para simular un paso del usuario.
- La evidencia de cada paso es:
  - la captura de la pantalla **tras la acción de UI**;
  - el log de consola y red;
  - la consulta SQL de verificación.
  Sin evidencia, el paso no está validado.
- Las pruebas funcionales y de rol van en `next dev` con bypass (el bypass está bloqueado en producción a propósito). **El rendimiento (Lighthouse) se mide con `next start`, sin otros agentes corriendo.**

## 3. Una versión de código y una base limpia por ronda
- Todas las pruebas de una ronda se hacen sobre **el mismo commit**, el último corregido. No se prueba código viejo en paralelo con correcciones.
- Antes de cada ronda de QA, la base local se restaura desde la instantánea base: `scripts/restore-full.ps1` sobre el dump de referencia en `C:\Users\jean_\ColdPowerBackups\`.
- **Un solo agente escribe en la base a la vez.** Los testers que mutan datos corren en secuencia. Los que solo leen pueden ir en paralelo.

## 4. Paralelismo y recursos
- Antes de lanzar: RAM libre ≥ 4 GB por tarea pesada y disco ≥ 20 GB. Como máximo 2 tareas pesadas simultáneas.
- Tarea paralela = worktree + rama propia + puerto propio. Se integra en secuencia, y **cada integración pasa por mi revisión del diff**.
- Al integrar se borra el worktree y su carpeta completa (incluido `node_modules`).

## 5. Supervisión activa (Claude)
- A los ~10 minutos de lanzar y luego cada ~20: tasa de comandos fallidos, errores repetidos, desvío de la tarea y lectura errónea de la orden. **Intervengo de inmediato**; no basta con que el proceso siga vivo.
- Vigilantes: un solo script (`watch-agents.sh`) que lee **solo la salida nueva** (offset), detecta el archivo final escrito (Codex no siempre termina el proceso), los límites de uso, la memoria y el disco. Nunca duplicados.

## 6. Cierre de cada tarea (Claude)
1. Leo el informe **y verifico sus afirmaciones** con evidencia propia (capturas, SQL, código). No repito a Jean nada no verificado.
2. **Reviso el diff** (archivo por archivo en lo riesgoso: dinero, permisos, datos, validaciones que afectan datos existentes).
3. `tsc`, lint 0/0, pruebas y build.
4. Commit, actualizo `BRECHAS.md` / `STATUS.md` y aviso a Jean de lo verificado y lo pendiente.

## 7. Entorno visible para Jean
- `localhost:3002` (`dev:local`) queda levantado al terminar cada ronda. Si hay que apagarlo, se reinicia después.
- El 3000 y el túnel se levantan cuando Neon esté disponible.
