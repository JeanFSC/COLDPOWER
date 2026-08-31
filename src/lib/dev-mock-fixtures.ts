export const DEV_MOCK_SEED_VERSION = "cp-dashboard-v5";
export const LEGACY_DEV_MOCK_SEED_VERSION = "cp-mock-v1";
export const LEGACY_DEV_MOCK_SEED_VERSIONS = ["cp-mock-v1", "cp-dashboard-v2", "cp-dashboard-v3", "cp-dashboard-v4"] as const;

export function assertDevMockSeedAllowed(
  env: { NODE_ENV?: string },
  args: string[],
) {
  if (env.NODE_ENV === "production") {
    throw new Error("No se permite cargar datos mock con NODE_ENV=production.");
  }
  if (!args.includes("--confirm-dev-mock")) {
    throw new Error("Debes confirmar el seed con --confirm-dev-mock.");
  }
}

export function assertDevDatabaseTarget(
  env: { NODE_ENV?: string; CP_DEV_AUTH_BYPASS?: string },
  args: string[],
) {
  if (env.NODE_ENV === "production") {
    throw new Error("El seed de dashboard sólo puede apuntar a desarrollo.");
  }
  if (env.CP_DEV_AUTH_BYPASS !== "true") {
    throw new Error("Falta CP_DEV_AUTH_BYPASS=true; se detuvo para proteger la base de datos.");
  }
  if (args.includes("--replace-legacy-mock") && !args.includes("--confirm-dev-mock")) {
    throw new Error("--replace-legacy-mock requiere --confirm-dev-mock.");
  }
}

export function mockFixtureId(entity: string, key: string) {
  return `${DEV_MOCK_SEED_VERSION}-${entity}-${key}`;
}
