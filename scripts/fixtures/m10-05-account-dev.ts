import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../../src/db";
import { customers } from "../../src/db/crm-schema";
import { users } from "../../src/db/schema";

const FIXTURE = "[DEV] M10-05 account ownership";
const SOURCE_CUSTOMER_ID = "cp-dashboard-v5-customer-013";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function isTruthy(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

function assertAllowed(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "production") throw new Error("La fixture de cuenta no se permite en producción.");
  if (!isTruthy(env.CP_DEV_AUTH_BYPASS)) throw new Error("Falta CP_DEV_AUTH_BYPASS=true.");
  if (!env.CP_DEV_AUTH_USER_ID?.trim()) throw new Error("Falta CP_DEV_AUTH_USER_ID.");
  if (!env.DATABASE_URL?.trim()) throw new Error("Falta DATABASE_URL.");
  const hostname = new URL(env.DATABASE_URL).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!LOCAL_HOSTS.has(hostname)) throw new Error(`Fixture detenida: DATABASE_URL apunta a ${hostname}.`);
}

export async function seedM1005AccountOwnership() {
  assertAllowed();
  const userId = process.env.CP_DEV_AUTH_USER_ID!.trim();
  const db = getDb();
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({ id: users.id, name: users.name, email: users.email, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user || user.status !== "ACTIVE") throw new Error("El usuario cliente local no existe o no está activo.");

    const [source] = await tx.select().from(customers).where(eq(customers.id, SOURCE_CUSTOMER_ID)).limit(1);
    if (!source) throw new Error(`No existe el cliente fuente ${SOURCE_CUSTOMER_ID}.`);
    if (source.userId && source.userId !== userId) throw new Error("El cliente fuente ya está asociado a otra cuenta; no se reasignó.");

    const [existingForUser] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.userId, userId)).limit(1);
    if (existingForUser && existingForUser.id !== SOURCE_CUSTOMER_ID) throw new Error("La cuenta ya tiene otro cliente asociado; no se modificó.");

    const [customer] = await tx
      .update(customers)
      .set({ userId, updatedAt: new Date(), notes: source.notes?.includes(FIXTURE) ? source.notes : `${source.notes ? `${source.notes} ` : ""}${FIXTURE}; ownership local para validar aislamiento.` })
      .where(eq(customers.id, SOURCE_CUSTOMER_ID))
      .returning({ id: customers.id, userId: customers.userId, name: customers.name });
    return { fixture: FIXTURE, user: { id: user.id, name: user.name, email: user.email }, customer };
  });
}

async function main() {
  try {
    console.log(JSON.stringify(await seedM1005AccountOwnership(), null, 2));
  } finally {
    await closeDb();
  }
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/fixtures/m10-05-account-dev.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
