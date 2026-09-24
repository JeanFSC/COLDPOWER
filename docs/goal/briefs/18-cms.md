# Brief 18 — CMS completo o se queda oculto (Codex)

Lee `AGENTS.md` y la evaluación del CMS del brief 11 (sección CMS de su informe y `src/lib/hidden-admin-modules.ts`). Base de datos **local**. Nunca Neon. Rama `codex/goal-impecable`. Diseño primero: boceto de las pantallas nuevas en `docs/goal/designs/cms/`, en el lenguaje del admin (slate/blue-600).

## Lo que falta (según el brief 11)
1. **Revisiones:** historial por contenido, vista de diferencias y "Restaurar esta versión" con auditoría.
2. **Publicación:** despublicar y programar publicación, con estados claros (borrador / publicado / programado / despublicado).
3. **Slots y media:** qué slot de la tienda ocupa cada contenido, validación de tamaños y formatos de imagen, y biblioteca de media con uso.
4. **Punta a punta:** editar en `/admin/cms` → publicar → verlo en la tienda → restaurar la versión anterior → la tienda vuelve a mostrarla. Con prueba automatizada y capturas.

## Regla
- Solo si todo pasa, desoculta:
  - `hidden-admin-modules.ts`;
  - el redirect de `admin/cms/page.tsx`;
  - el filtro de `admin-workspace-service.ts`.
- Si no, sigue oculto y se reporta qué falta.
- **El CMS no puede cambiar la composición del home espejo**: solo contenidos en slots existentes.

## Verificación
- Sin commit. `tsc`, lint (0/0), `test-all` y `build`.
- Capturas en `docs/goal/evidencia/18/`.
- Reporta.
