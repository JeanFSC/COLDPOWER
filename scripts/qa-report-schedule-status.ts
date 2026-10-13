import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { reportSchedules } from "../src/db/reporting-schema";

async function main() {
  try {
    const rows = await getDb().select({
      id: reportSchedules.id,
      name: reportSchedules.name,
      status: reportSchedules.status,
      updatedAt: reportSchedules.updatedAt,
    }).from(reportSchedules).where(eq(reportSchedules.id, "report-schedule-e0115752-abcf-47af-a8e9-81716c52ce49"));
    console.log(JSON.stringify(rows));
  } finally {
    await closeDb();
  }
}
void main();
