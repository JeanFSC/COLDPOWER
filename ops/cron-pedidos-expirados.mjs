import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const CRON_PATH = "/api/internal/cron/pedidos-expirados";
const REQUEST_TIMEOUT_MS = 30_000;
const STARTUP_GRACE_MS = 30_000;
const DEFAULT_INTERVAL_MS = 5 * 60_000;
const MAX_INTERVAL_MS = 60 * 60_000;

export async function runExpirySweep({
  fetchImpl = fetch,
  baseUrl = process.env.COLDPOWER_INTERNAL_BASE_URL ?? "http://127.0.0.1:3000",
  secret = process.env.CRON_SECRET,
  logger = console,
} = {}) {
  const token = secret?.trim();
  if (!token) throw new Error("CRON_SECRET no está configurado.");

  const response = await fetchImpl(new URL(CRON_PATH, baseUrl), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) {
    throw new Error(`El barrido de vencimientos respondió HTTP ${response.status}.`);
  }

  const result = {
    ordersChecked: Number(payload.orders?.checked ?? 0),
    ordersCancelled: Array.isArray(payload.orders?.cancelled) ? payload.orders.cancelled.length : 0,
    reservationsExpired: Number(payload.inventoryReservations?.count ?? 0),
  };
  logger.info(JSON.stringify({ event: "coldpower.expiry_sweep.completed", ...result }));
  return result;
}

function configuredInterval() {
  const configured = Number(process.env.COLDPOWER_EXPIRY_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  if (!Number.isSafeInteger(configured) || configured < 60_000 || configured > MAX_INTERVAL_MS) {
    throw new Error("COLDPOWER_EXPIRY_INTERVAL_MS debe estar entre 60000 y 3600000 ms.");
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
      await runExpirySweep({ secret });
    } catch (error) {
      console.error(JSON.stringify({
        event: "coldpower.expiry_sweep.failed",
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
    console.error(error instanceof Error ? error.message : "No se pudo iniciar el barrido de vencimientos.");
    process.exitCode = 1;
  });
}
