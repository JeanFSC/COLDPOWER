import { and, asc, eq, inArray } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getDb } from "../src/db";
import {
  opportunities,
  opportunityFollowups,
  opportunityStageHistory,
  users,
} from "../src/db/combined-schema";
import {
  assertDevDatabaseTarget,
  assertDevMockSeedAllowed,
  mockFixtureId,
} from "../src/lib/dev-mock-fixtures";

const day = 24 * 60 * 60 * 1000;
const shiftedDate = (daysFromNow: number) => new Date(Date.now() + daysFromNow * day);
const id = (entity: string, key: string) => mockFixtureId(entity, key);

const followUpTitles = [
  "Llamar para confirmar disponibilidad",
  "Enviar cotización actualizada",
  "Coordinar visita técnica",
  "Confirmar fecha de instalación",
  "Reenviar ficha técnica solicitada",
  "Validar forma de pago con el cliente",
];

export async function seedPipelineGaps() {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [actor] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.roleCode, "SUPERADMIN"), eq(users.status, "ACTIVE")))
      .orderBy(asc(users.createdAt))
      .limit(1);
    if (!actor) throw new Error("No se encontró un usuario SUPERADMIN activo para firmar el seed.");

    // 1) Mover algunas oportunidades NEW a CONTACTED (el seed original nunca generaba este stage).
    const newStageRows = await tx
      .select({ id: opportunities.id, assignedSellerId: opportunities.assignedSellerId })
      .from(opportunities)
      .where(and(eq(opportunities.stage, "NEW")))
      .orderBy(asc(opportunities.id))
      .limit(5);

    let contactedCount = 0;
    for (const row of newStageRows) {
      await tx
        .update(opportunities)
        .set({
          stage: "CONTACTED",
          lastContactAt: shiftedDate(-1),
          nextAction: "Confirmar especificaciones y despacho",
          updatedAt: new Date(),
        })
        .where(eq(opportunities.id, row.id));
      await tx.insert(opportunityStageHistory).values({
        id: id("opportunity-history-gap", row.id),
        opportunityId: row.id,
        fromStage: "NEW",
        toStage: "CONTACTED",
        changedBy: actor.id,
        note: "Contacto inicial registrado con el cliente.",
        createdAt: shiftedDate(-1),
      }).onConflictDoNothing();
      contactedCount += 1;
    }

    // 2) Crear seguimientos pendientes reales (la tabla opportunity_followups nunca se sembraba).
    const openStageRows = await tx
      .select({ id: opportunities.id, assignedSellerId: opportunities.assignedSellerId })
      .from(opportunities)
      .where(
        inArray(opportunities.stage, ["NEW", "CONTACTED", "QUOTE_SENT", "FOLLOW_UP", "NEGOTIATION"]),
      )
      .orderBy(asc(opportunities.id))
      .limit(followUpTitles.length);

    const followUpOffsets = [-2, -1, 0, 1, 2, 3];
    const followUpRows = openStageRows.map((row, index) => ({
      id: id("opportunity-followup-gap", row.id),
      opportunityId: row.id,
      title: followUpTitles[index % followUpTitles.length],
      dueAt: shiftedDate(followUpOffsets[index % followUpOffsets.length]),
      status: "PENDING" as const,
      assignedTo: row.assignedSellerId,
      createdBy: actor.id,
      createdAt: shiftedDate(-1),
    }));
    const insertedFollowUps = followUpRows.length
      ? await tx
          .insert(opportunityFollowups)
          .values(followUpRows)
          .onConflictDoNothing()
          .returning({ id: opportunityFollowups.id })
      : [];

    return { contactedCount, followUpsInserted: insertedFollowUps.length };
  });
}

async function main() {
  assertDevMockSeedAllowed(process.env, process.argv);
  assertDevDatabaseTarget(process.env, process.argv);
  const result = await seedPipelineGaps();
  console.log(JSON.stringify(result, null, 2));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
