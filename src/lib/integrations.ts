import { connect } from "node:net";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { integrationConnections } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_INTEGRATION_MODULE, AUDIT_INTEGRATION_TEST_ACTION } from "@/lib/audit-contract";

export type IntegrationStatus = "CONNECTED" | "TESTING" | "DISCONNECTED" | "NOT_CONFIGURED";
export type IntegrationCheckResult = { status: IntegrationStatus; message: string };

type IntegrationDefinition = {
  key: string;
  label: string;
  description: string;
  category: string;
  requiredEnv: string[];
  check: () => Promise<IntegrationCheckResult>;
};

function missingEnv(keys: string[]): string[] {
  return keys.filter((key) => !process.env[key]?.trim());
}

// Opens a TCP connection and reads the server's initial line — enough to confirm the
// service is actually reachable without sending any credentials over the wire.
function probeTcpBanner(host: string, port: number, expectedPrefix: string, timeoutMs = 4000): Promise<IntegrationCheckResult> {
  return new Promise((resolve) => {
    const socket = connect({ host, port, timeout: timeoutMs });
    let settled = false;
    const finish = (result: IntegrationCheckResult) => { if (settled) return; settled = true; socket.destroy(); resolve(result); };
    socket.once("connect", () => {});
    socket.once("data", (chunk) => {
      const line = chunk.toString("utf8");
      finish(line.startsWith(expectedPrefix)
        ? { status: "CONNECTED", message: `Conectado a ${host}:${port}.` }
        : { status: "DISCONNECTED", message: `Respuesta inesperada de ${host}:${port}.` });
    });
    socket.once("timeout", () => finish({ status: "DISCONNECTED", message: `Tiempo de espera agotado al conectar con ${host}:${port}.` }));
    socket.once("error", (error) => finish({ status: "DISCONNECTED", message: `No se pudo conectar a ${host}:${port}: ${error.message}` }));
  });
}

async function probeHttp(url: string, init?: RequestInit, timeoutMs = 5000): Promise<IntegrationCheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (response.ok) return { status: "CONNECTED", message: `Respuesta HTTP ${response.status} de ${new URL(url).host}.` };
    return { status: "DISCONNECTED", message: `Respuesta HTTP ${response.status} de ${new URL(url).host}.` };
  } catch (error) {
    return { status: "DISCONNECTED", message: error instanceof Error ? `No se pudo contactar el servicio: ${error.message}` : "No se pudo contactar el servicio." };
  } finally {
    clearTimeout(timer);
  }
}

export const INTEGRATION_DEFINITIONS: IntegrationDefinition[] = [
  {
    key: "sunat",
    label: "SUNAT",
    description: "Consulta de RUC y facturación electrónica",
    category: "Facturación",
    requiredEnv: ["SUNAT_RUC", "SUNAT_SOL_USER", "SUNAT_SOL_PASSWORD"],
    check: async () => {
      const missing = missingEnv(["SUNAT_RUC", "SUNAT_SOL_USER", "SUNAT_SOL_PASSWORD"]);
      if (missing.length) return { status: "NOT_CONFIGURED", message: `Faltan variables de entorno: ${missing.join(", ")}.` };
      return probeHttp("https://e-factura.sunat.gob.pe/", { method: "HEAD" });
    },
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    description: "Notificaciones y comunicación con clientes",
    category: "Comunicaciones",
    requiredEnv: ["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ACCESS_TOKEN"],
    check: async () => {
      const missing = missingEnv(["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ACCESS_TOKEN"]);
      if (missing.length) return { status: "NOT_CONFIGURED", message: `Faltan variables de entorno: ${missing.join(", ")}.` };
      return probeHttp(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } });
    },
  },
  {
    key: "email_smtp",
    label: "Email (SMTP)",
    description: "Envío de documentos y notificaciones",
    category: "Comunicaciones",
    requiredEnv: ["SMTP_HOST", "SMTP_PORT"],
    check: async () => {
      const missing = missingEnv(["SMTP_HOST", "SMTP_PORT"]);
      if (missing.length) return { status: "NOT_CONFIGURED", message: `Faltan variables de entorno: ${missing.join(", ")}.` };
      const port = Number(process.env.SMTP_PORT);
      if (!Number.isInteger(port) || port <= 0) return { status: "DISCONNECTED", message: "SMTP_PORT no es un puerto válido." };
      return probeTcpBanner(process.env.SMTP_HOST!.trim(), port, "220");
    },
  },
  {
    key: "payment_gateway",
    label: "Pasarela de pagos",
    description: "Procesamiento de pagos online",
    category: "Pagos",
    requiredEnv: ["PAYMENT_GATEWAY_API_URL", "PAYMENT_GATEWAY_API_KEY"],
    check: async () => {
      const missing = missingEnv(["PAYMENT_GATEWAY_API_URL", "PAYMENT_GATEWAY_API_KEY"]);
      if (missing.length) return { status: "NOT_CONFIGURED", message: `Faltan variables de entorno: ${missing.join(", ")}.` };
      return probeHttp(process.env.PAYMENT_GATEWAY_API_URL!, { headers: { Authorization: `Bearer ${process.env.PAYMENT_GATEWAY_API_KEY}` } });
    },
  },
  {
    key: "external_api",
    label: "API externa",
    description: "Sincronización con sistemas externos",
    category: "Integración",
    requiredEnv: ["EXTERNAL_API_BASE_URL", "EXTERNAL_API_KEY"],
    check: async () => {
      const missing = missingEnv(["EXTERNAL_API_BASE_URL", "EXTERNAL_API_KEY"]);
      if (missing.length) return { status: "NOT_CONFIGURED", message: `Faltan variables de entorno: ${missing.join(", ")}.` };
      return probeHttp(process.env.EXTERNAL_API_BASE_URL!, { headers: { Authorization: `Bearer ${process.env.EXTERNAL_API_KEY}` } });
    },
  },
];

export type IntegrationRow = typeof integrationConnections.$inferSelect;

// Ensures the catalog metadata (label/description/category — not status) exists as rows so
// the UI has something to list even before any check has run. Status defaults to
// NOT_CONFIGURED, which reflects reality: no credentials are set anywhere yet.
export async function ensureIntegrationCatalog(): Promise<void> {
  const db = getDb();
  const existing = await db.select({ key: integrationConnections.key }).from(integrationConnections);
  const existingKeys = new Set(existing.map((row) => row.key));
  const missing = INTEGRATION_DEFINITIONS.filter((definition) => !existingKeys.has(definition.key));
  if (!missing.length) return;
  await db.insert(integrationConnections).values(missing.map((definition) => ({
    id: definition.key,
    key: definition.key,
    label: definition.label,
    description: definition.description,
    category: definition.category,
  }))).onConflictDoNothing();
}

export async function listIntegrations(): Promise<IntegrationRow[]> {
  await ensureIntegrationCatalog();
  return getDb().select().from(integrationConnections).orderBy(integrationConnections.label);
}

export async function countConnectedIntegrations(): Promise<number> {
  const rows = await listIntegrations();
  return rows.filter((row) => row.lastCheckedStatus === "CONNECTED").length;
}

export async function testIntegration(key: string, actorId?: string): Promise<IntegrationRow> {
  const definition = INTEGRATION_DEFINITIONS.find((item) => item.key === key);
  if (!definition) throw new Error(`Integración desconocida: ${key}.`);
  await ensureIntegrationCatalog();
  const result = await definition.check();
  const [updated] = await getDb().update(integrationConnections).set({
    lastCheckedStatus: result.status,
    lastCheckedMessage: result.message,
    lastCheckedAt: new Date(),
    lastCheckedBy: actorId,
    updatedAt: new Date(),
  }).where(eq(integrationConnections.key, key)).returning();
  if (!updated) throw new Error("No se pudo actualizar el estado de la integración.");
  await writeAuditLog({
    actorId: actorId ?? null,
    action: AUDIT_INTEGRATION_TEST_ACTION,
    entityType: "integration",
    entityId: key,
    module: AUDIT_INTEGRATION_MODULE,
    severity: result.status === "DISCONNECTED" ? "WARNING" : "INFO",
    before: null,
    after: { status: result.status, message: result.message },
  });
  return updated;
}

export async function testAllIntegrations(actorId?: string): Promise<IntegrationRow[]> {
  await ensureIntegrationCatalog();
  const results: IntegrationRow[] = [];
  for (const definition of INTEGRATION_DEFINITIONS) results.push(await testIntegration(definition.key, actorId));
  return results;
}
