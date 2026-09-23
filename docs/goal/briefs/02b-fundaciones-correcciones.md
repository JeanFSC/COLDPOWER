# Brief 02b — Correcciones a fundaciones (Codex)

Hallazgos de la revisión (stop-gate) sobre el trabajo del brief 02. Corrígelos antes de dar el brief por cerrado:

1. **Deep-link de oportunidades roto**: la búsqueda global (`src/app/api/admin/busqueda/route.ts`) ahora enlaza a `/admin/crm?view=pipeline&opportunityId=…`, pero `src/components/admin/PipelineWorkspace.tsx` (y `src/lib/pipeline-contract.ts`) no leen `opportunityId`. Haz que el pipeline abra el drawer de esa oportunidad al cargar con `opportunityId` (y `taskId` → drawer de la oportunidad dueña de la tarea). Test que lo cubra.
2. **`scripts/test-all.mjs` eliminó cobertura válida**: revisa el diff de `test-all.mjs` contra `HEAD`; ningún test que antes corría y sigue siendo válido puede salir del agregador. Solo se retiran tests que validaban exclusivamente componentes borrados, y cada uno debe quedar reemplazado por un test de comportamiento del componente vivo. Lista en tu reporte: tests agregados, retirados (con motivo) y reemplazos.

Reglas: sin commit, tests con `--test-timeout=60000`, sin `*:runtime`. Reporta archivos cambiados y resultados.
