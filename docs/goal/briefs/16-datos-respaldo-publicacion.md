# Brief 16 — Respaldos completos, publicación de catálogo y flujos sin probar (Codex)

Lee `AGENTS.md`. Rama `codex/goal-impecable`. Base de datos **local** (`.env.localdb`). Nunca Neon. Mismas reglas de evidencia que el brief 15 (capturas en `docs/goal/evidencia/16/`).

## 1. Respaldo completo (brecha crítica)
- `scripts/backup-full.ps1`: `pg_dump -Fc` completo, con todas las tablas, secuencias y enums, usando los binarios de `C:\Users\jean_\pg17`.
  - Destino: `C:\Users\jean_\ColdPowerBackups\coldpower-<entorno>-<fecha>.dump`.
  - Retención de 14 días.
  - Funciona contra una URL local o de Neon, pasada por parámetro. No lo ejecutes contra Neon.
- `scripts/restore-full.ps1`: restaura un `.dump` en una base **nueva local** (`coldpower_restore_test`) y compara los conteos de todas las tablas con el origen. Se niega a apuntar a cualquier host que no sea localhost.
- `ops/register-backup-task.ps1`: registra una tarea diaria (02:00) en el Programador de tareas de Windows. **No la registres**; Jean decide.
- Prueba de punta a punta en local: respaldo → restauración en la base de prueba → conteos idénticos.
- Documenta en `docs/dev/respaldos.md`, incluida la copia a la nube (OneDrive), como paso manual o configurable.

## 2. Cola de publicación del catálogo
- Hoy 1.344 de 1.348 productos están en `review`.
- En `/admin/catalogo`:
  - filtro "En revisión";
  - checklist por producto (nombre, familia, categoría e imagen o placeholder resuelto);
  - selección múltiple;
  - acción "Publicar seleccionados", con confirmación, auditoría y permiso `catalog.product.publish` (o el equivalente existente).
- También "Despublicar".
- **No publiques nada automáticamente**; la decisión es de Jean.
- Prueba en local: publicar 3 productos y ver que aparecen en `/catalogo`; despublicar y ver que desaparecen.

## 3. Foto real de producto de punta a punta
Prueba automatizada (script Playwright o test de integración contra la base local):
1. subir una imagen desde `/admin/catalogo/[id]`;
2. marcarla como principal;
3. verla en la ficha pública y en la tarjeta del catálogo, sin el chip "Imagen referencial";
4. borrarla y ver que vuelve el placeholder de su familia.

## 4. Pedidos y despacho del cliente
- Fixture de desarrollo (idempotente, bloqueada fuera de localhost): pedidos del usuario de prueba en cada estado (pendiente de pago, pagado, en preparación, despachado, entregado, cancelado).
- Valida `/cuenta/pedidos` y `/cuenta/pedidos/[code]`: línea de tiempo, imagen de despacho, montos y enlaces.
- Valida lo mismo en el admin (`/admin/pedidos`) con el rol de ventas.

## Verificación
- Sin commit.
- `tsc`, lint (0/0), `test-all` y `build` con `.env.localdb`.
- Reporta evidencia, archivos cambiados y riesgos.
