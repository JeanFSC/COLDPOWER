import {
  artifactPath,
  capture,
  captureSql,
  closeQaBrowser,
  compactError,
  createQaBrowser,
  resultRecord,
  runSql,
  visit,
  writeJson,
} from "./b-helpers.mjs";

const scenario = "B7.2-company-settings-restore";
const temporaryName = `ColdPower QA B7.2 ${Date.now()}`;

function firstRow(query) {
  const line = runSql(query).split(/\r?\n/)[0]?.trim();
  if (!line) throw new Error("No se encontró el registro esperado en PostgreSQL local.");
  return line.split("\t");
}

const session = await createQaBrowser(scenario);
const { page } = session;
const evidence = { scenario, temporaryName, stages: [] };

try {
  const before = firstRow("SELECT id,version,commercial_name,legal_name,ruc,updated_by FROM company_settings WHERE id='default';");
  const beforeVersion = Number(before[1]);
  evidence.before = { version: beforeVersion, commercialName: before[2], legalName: before[3], ruc: before[4], updatedBy: before[5] };
  captureSql(scenario, "before", "SELECT id,version,commercial_name,legal_name,ruc,updated_by,updated_at FROM company_settings WHERE id='default'; SELECT id,version,actor_id,actor_role,created_at FROM company_settings_history WHERE settings_id='default' ORDER BY version DESC LIMIT 8;");

  await visit(page, "/admin/configuracion");
  await capture(scenario, "01-settings-before", page);
  await page.getByLabel("Nombre comercial", { exact: true }).fill(temporaryName);
  await capture(scenario, "02-settings-edited", page);
  await page.getByRole("button", { name: "Guardar configuración", exact: true }).click();
  await page.waitForTimeout(1_800);
  await capture(scenario, "03-settings-saved", page);
  const afterSave = firstRow("SELECT id,version,commercial_name,legal_name,ruc,updated_by FROM company_settings WHERE id='default';");
  evidence.afterSave = { version: Number(afterSave[1]), commercialName: afterSave[2], updatedBy: afterSave[5] };
  captureSql(scenario, "after-save", "SELECT id,version,commercial_name,legal_name,ruc,updated_by,updated_at FROM company_settings WHERE id='default'; SELECT id,version,actor_id,actor_role,before,after,created_at FROM company_settings_history WHERE settings_id='default' ORDER BY version DESC LIMIT 5; SELECT id,action,entity_type,entity_id,actor_id,actor_role,created_at FROM audit_logs WHERE entity_id='default' ORDER BY created_at DESC LIMIT 10;");
  if (afterSave[2] !== temporaryName || Number(afterSave[1]) <= beforeVersion) throw new Error(`El guardado no creó la versión esperada: ${afterSave.join(" | ")}`);
  evidence.stages.push({ stage: "settings_save_ui_mutation", completed: true, version: Number(afterSave[1]) });

  const previousVersionButton = page.locator("button").filter({ hasText: new RegExp(`Versi.n\\s+${beforeVersion}`) }).first();
  await previousVersionButton.waitFor({ state: "visible", timeout: 15_000 });
  await previousVersionButton.click();
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await page.getByRole("alertdialog", { name: "Confirmar restauración" }).getByRole("button", { name: "Confirmar restauración", exact: true }).click();
  await page.waitForTimeout(2_200);
  await capture(scenario, "04-settings-restored", page);
  const afterRestore = firstRow("SELECT id,version,commercial_name,legal_name,ruc,updated_by FROM company_settings WHERE id='default';");
  evidence.afterRestore = { version: Number(afterRestore[1]), commercialName: afterRestore[2], updatedBy: afterRestore[5] };
  captureSql(scenario, "after-restore", "SELECT id,version,commercial_name,legal_name,ruc,updated_by,updated_at FROM company_settings WHERE id='default'; SELECT id,version,actor_id,actor_role,before,after,created_at FROM company_settings_history WHERE settings_id='default' ORDER BY version DESC LIMIT 6; SELECT id,action,entity_type,entity_id,actor_id,actor_role,created_at FROM audit_logs WHERE entity_id='default' ORDER BY created_at DESC LIMIT 15;");
  if (afterRestore[2] !== before[2] || Number(afterRestore[1]) <= Number(afterSave[1])) throw new Error(`La restauración no volvió al valor anterior: ${afterRestore.join(" | ")}`);
  evidence.stages.push({ stage: "settings_restore_ui_mutation", completed: true, restoredVersion: beforeVersion, newVersion: Number(afterRestore[1]) });
  resultRecord(scenario, { outcome: "COMPLETED", ...evidence });
  console.log(JSON.stringify({ outcome: "COMPLETED", ...evidence }, null, 2));
} catch (error) {
  await capture(scenario, "error", page).catch(() => undefined);
  writeJson(artifactPath(scenario, "error.json"), { error: compactError(error), evidence, browserEvents: session.events });
  resultRecord(scenario, { outcome: "BLOCKED", error: compactError(error), ...evidence });
  console.log(JSON.stringify({ outcome: "BLOCKED", error: compactError(error), ...evidence }, null, 2));
  process.exitCode = 1;
} finally {
  await closeQaBrowser(session);
}
