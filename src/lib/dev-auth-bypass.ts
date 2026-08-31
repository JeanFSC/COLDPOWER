export type DevAuthEnvironment = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  CP_DEV_AUTH_BYPASS?: string;
  CP_DEV_AUTH_USER_ID?: string;
  CP_DEV_AUTH_ALLOWED_HOSTS?: string;
};

function isTruthy(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

function normalizeHost(host: string) {
  return host.trim().toLowerCase().replace(/\.$/, "");
}

export function getDevAuthUserId(host: string | null, env: DevAuthEnvironment = process.env) {
  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production" || !isTruthy(env.CP_DEV_AUTH_BYPASS)) return null;

  const userId = env.CP_DEV_AUTH_USER_ID?.trim();
  if (!userId || !host) return null;

  const allowedHosts = (env.CP_DEV_AUTH_ALLOWED_HOSTS ?? "")
    .split(",")
    .map(normalizeHost)
    .filter(Boolean);
  if (!allowedHosts.includes(normalizeHost(host))) return null;

  return userId;
}
