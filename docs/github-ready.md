# GitHub Ready — Checklist antes del primer commit

Guía para subir ColdPower a GitHub de forma segura. **No ejecutar nada automáticamente**; el dueño del repo corre los comandos.

## Checklist antes del primer commit

- [ ] `pnpm lint` pasa.
- [ ] `pnpm build` pasa.
- [ ] `pnpm test:all` pasa.
- [ ] Revisar `git status --short` y confirmar que no aparezca ningún archivo sensible.
- [ ] Confirmar que **no** se suben `.env`, `.env.local`, `.env.preview` ni `.vercel`.
- [ ] Confirmar que **sí** se suben `.env.example` y `.env.preview.example`.
- [ ] No hay credenciales, tokens ni datos reales en el repo.
- [ ] Decidir si versionar `.claude/` (config local de launch del editor; opcional).

## Qué revisar con `git status`

```bash
git status --short
```

- `??` = archivos nuevos no versionados (revisar uno por uno).
- ` M` = modificados.
- No debe aparecer ningún `.env` real ni carpetas de artefactos (`.next`, `test-results`, etc.).

## Archivos que DEBEN estar versionados

- Código fuente: `src/**`
- Datos mock: `src/data/**`
- Documentación: `docs/**`, `README.md`
- Tests de fase: `scripts/**`
- Config: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`
- Ejemplos de entorno: `.env.example`, `.env.preview.example`
- Assets propios: `public/images/**`

## Archivos que NUNCA deben subirse

- `node_modules/`
- `.next/`, `out/`, `dist/`, `build/`, `output/`
- `.env`, `.env.local`, `.env.*.local`, `.env.preview` (cualquier `.env` real)
- `.vercel`
- `test-results/`, `playwright-report/`, `.playwright-cli/`, `coverage/`
- Logs (`*.log`), `.DS_Store`, `Thumbs.db`

## Comandos sugeridos (ejecutar manualmente)

> No los ejecuta el asistente. Reemplaza `<URL_DEL_REPO>` por la URL real.

```bash
git add .
git commit -m "chore: prepare ColdPower preview-ready v1"
git branch -M main
git remote add origin <URL_DEL_REPO>
git push -u origin main
```

## Nota

El repositorio se sube como **preview-ready**, no como producción. Para producción real ver [deployment.md](deployment.md) y [production-checklist.md](production-checklist.md): datos reales obligatorios, `NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=false` y `NEXT_PUBLIC_IS_PREVIEW=false`.
