import { spawn } from "node:child_process";
import path from "node:path";

const SEED_SCRIPTS = [
  "seed-dev-mock.ts",
  "seed-visual-year.ts",
  "seed-purchases-dev.ts",
  "seed-pipeline-gaps.ts",
  "seed-notifications-dev.ts",
  "seed-team-activity-dev.ts",
  "seed-catalog-kpi-visual-history.ts",
  "seed-home-espejo.ts",
] as const;

function runSeed(scriptName: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs"), path.resolve(process.cwd(), "scripts", scriptName), "--confirm-dev-mock"],
      { cwd: process.cwd(), env: process.env, stdio: "inherit", shell: false },
    );
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`${scriptName} terminó con código ${code ?? `señal ${signal ?? "desconocida"}`}.`));
    });
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Los seeds locales no se pueden ejecutar en producción.");
  if (process.env.CP_DEV_AUTH_BYPASS !== "true") throw new Error("Falta CP_DEV_AUTH_BYPASS=true para ejecutar los seeds locales.");

  for (const scriptName of SEED_SCRIPTS) {
    console.log(`\n> Aplicando ${scriptName}`);
    await runSeed(scriptName);
  }

  console.log(`\nSeeds locales completados: ${SEED_SCRIPTS.length} scripts.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
