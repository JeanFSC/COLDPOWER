import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const REQUEST_TIMEOUT_MS = 30_000;
const STARTUP_GRACE_MS = 30_000;
const DEFAULT_INTERVAL_MS = 5 * 60_000;
const MAX_INTERVAL_MS = 60 * 60_000;
const JOBS = [
  { name: "expiry", path: "/api/internal/cron/pedidos-expirados" },
  { name: "management", path: "/api/cron/gestion" },
];

async function postCronRoute({ fetchImpl, baseUrl, secret, path }) {
  const response = await fetchImpl(new URL(path, baseUrl), {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return payload;
}

function count(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function runScheduledJobs({
  fetchImpl = fetch,
  baseUrl = process.env.COLDPOWER_INTERNAL_BASE_URL ?? "http://127.0.0.1:3000",
  secret = process.env.CRON_SECRET,
  logger = console,
} = {}) {
  const token = secret?.trim();
  if (!token) throw new Error("CRON_SECRET no está configurado.");

  const results = await Promise.all(JOBS.map(async (job) => {
    try {
      const payload = await postCronRoute({ fetchImpl, baseUrl, secret: token, path: job.path });
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Respuesta inválida");
      if (job.name === "expiry") {
        if (payload.success !== true) throw new Error("Respuesta inválida");
        const result = {
          job: job.name,
          ordersChecked: count(payload.orders?.checked),
          ordersCancelled: Array.isArray(payload.orders?.cancelled) ? payload.orders.cancelled.length : 0,
          reservationsExpired: count(payload.inventoryReservations?.count),
        };
        logger.info(JSON.stringify({ event: "coldpower.cron.completed", ...result }));
        return result;
      }

      if (!payload.reports || !payload.notifications) throw new Error("Respuesta inválida");
      const result = {
        job: job.name,
        reportsProcessed: count(payload.reports?.processed),
        reportsSucceeded: count(payload.reports?.succeeded),
        reportsFailed: count(payload.reports?.failed),
        notificationsProcessed: count(payload.notifications?.processed),
        notificationsDelivered: count(payload.notifications?.delivered),
        notificationsFailed: count(payload.notifications?.failed),
      };
      logger.info(JSON.stringify({ event: "coldpower.cron.completed", ...result }));
      return result;
    } catch (error) {
      logger.error(JSON.stringify({
        event: "coldpower.cron.failed",
        job: job.name,
        message: error instanceof Error && /^HTTP \d+$/.test(error.message) ? error.message : "Fallo de comunicación o respuesta inválida",
      }));
      return { job: job.name, failed: true };
    }
  }));

  const failed = results.filter((result) => result.failed).map((result) => result.job);
  if (failed.length) throw new Error(`Fallaron los procesos programados: ${failed.join(", ")}.`);
  return results;
}

function configuredInterval() {
  const configured = Number(process.env.COLDPOWER_CRON_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  if (!Number.isSafeInteger(configured) || configured < 60_000 || configured > MAX_INTERVAL_MS) {
    throw new Error("COLDPOWER_CRON_INTERVAL_MS debe estar entre 60000 y 3600000 ms.");
  }
  return configured;
}

async function runForever() {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) throw new Error("CRON_SECRET no está configurado.");
  const intervalMs = configuredInterval();

  await delay(STARTUP_GRACE_MS);
  while (true) {
    try {
      await runScheduledJobs({ secret });
    } catch (error) {
      console.error(JSON.stringify({
        event: "coldpower.cron.cycle_failed",
        message: error instanceof Error ? error.message : "Error desconocido.",
      }));
    }
    await delay(intervalMs);
  }
}

const invokedAsScript = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedAsScript) {
  runForever().catch((error) => {
    console.error(error instanceof Error ? error.message : "No se pudo iniciar el scheduler.");
    process.exitCode = 1;
  });
}
