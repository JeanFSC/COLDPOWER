type DevAuthBypassOptions = {
  requestHost?: string | null;
  nodeEnv?: string | undefined;
  deploymentEnv?: string | undefined;
  enabled?: string | undefined;
  userId?: string | undefined;
  allowedHosts?: string | undefined;
};

const DEFAULT_ALLOWED_HOSTS = "localhost:3000";

function parseBoolean(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "");
}

function normalizeHost(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function isProduction(options: Pick<DevAuthBypassOptions, "nodeEnv" | "deploymentEnv">) {
  return options.nodeEnv === "production" || options.deploymentEnv === "production";
}

export function assertDevAuthBypassSafe(options: Pick<DevAuthBypassOptions, "nodeEnv" | "deploymentEnv" | "enabled"> = {}) {
  if (isProduction(options) && parseBoolean(options.enabled)) {
    throw new Error("CP_DEV_AUTH_BYPASS no puede activarse en producción.");
  }
}

export function resolveDevAuthBypassUserId(options: DevAuthBypassOptions = {}) {
  assertDevAuthBypassSafe(options);
  if (isProduction(options) || !parseBoolean(options.enabled)) return null;

  const userId = options.userId?.trim();
  const requestHost = options.requestHost?.trim();
  if (!userId || !requestHost) return null;

  const allowedHosts = (options.allowedHosts || DEFAULT_ALLOWED_HOSTS)
    .split(",")
    .map(normalizeHost)
    .filter(Boolean);
  return allowedHosts.includes(normalizeHost(requestHost)) ? userId : null;
}

export function getDevAuthBypassUserId(requestHost: string | null | undefined) {
  return resolveDevAuthBypassUserId({
    requestHost,
    nodeEnv: process.env.NODE_ENV,
    deploymentEnv: process.env.VERCEL_ENV,
    enabled: process.env.CP_DEV_AUTH_BYPASS,
    userId: process.env.CP_DEV_AUTH_USER_ID,
    allowedHosts: process.env.CP_DEV_AUTH_ALLOWED_HOSTS,
  });
}

