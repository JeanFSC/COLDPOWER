# Recorrido funcional create → approve → activate → pause

El recorrido se realizó con la UI autenticada en `http://localhost:3003` y se verificó después con PostgreSQL local.

## Secuencia

1. **Crear:** se creó `QA Promo Flow` desde `Nueva promoción`, con alcance explícito y preflight real. La primera prueba usó `CP-COC-OTR-1046`; después se editó la campaña a `CP-LAV-FAJ-0560`, sin conflicto. Para 15% el preflight mostró base `S/ 75.00`, final `S/ 63.75` y ahorro `S/ 11.25`.
2. **Control de autoaprobación:** el intento de aprobar con la misma persona creadora fue rechazado por el servidor con `La persona que creó la promoción no puede aprobarla.`
3. **Preparación QA local:** para probar el segundo actor sin debilitar RBAC, se reasignó únicamente `created_by` de esa fila QA a `cp-dashboard-v5-user-staff-006` mediante SQL local. No es una modificación de producción ni una regla del dominio.
4. **Aprobar:** Gerencia aprobó desde la acción de la cola; la UI mostró `Aprobación registrada y auditada.`
5. **Activar:** Gerencia activó desde la acción de la cola; la UI mostró `Campaña activada y auditada.`
6. **Pausar:** Gerencia confirmó la acción destructiva; la UI mostró `Campaña pausada y auditada.`

## Verificación SQL final

Fila final observada antes de la limpieza:

```text
id                                      status    approval_status  created_by                         approved_by
promotion-e8000d5f-a2c2-429e-ade1-39f2f744b490 INACTIVE APPROVED        cp-dashboard-v5-user-staff-006   cp-dashboard-v5-user-gerencia
```

Historial `audit_logs` de la campaña:

```text
promotions.created   -> DRAFT    / PENDING
promotions.updated   DRAFT -> DRAFT    / PENDING -> PENDING
promotions.approved  DRAFT -> DRAFT    / PENDING -> APPROVED
promotions.updated   DRAFT -> ACTIVE   / APPROVED -> APPROVED
promotions.updated   ACTIVE -> INACTIVE / APPROVED -> APPROVED
```

Tras la evidencia se eliminaron sólo `QA Promo Flow` y, en esta revisión, se ejecutó `corepack pnpm exec dotenv -e .env.localdb -- tsx scripts/fixtures/promotions-dev.ts --cleanup` para retirar las seis promociones de desarrollo junto con sus relaciones. La verificación posterior devolvió **0 filas** para `name like '[DEV]%'` o `name = 'QA Promo Flow'`. Los audit logs QA se conservaron porque `audit_logs` es append-only.

Consulta de limpieza sobre PostgreSQL local (PG18, `127.0.0.1:5433`): `select count(*) from promotions where name like '[DEV]%'` → `0`.

La promoción preexistente `Fixture visual Home Espejo` no fue creada por este ticket y se dejó intacta.
