import {
  artifactPath,
  capture,
  captureSql,
  closeQaBrowser,
  compactError,
  createQaBrowser,
  fillPlaceholder,
  probeApi,
  resultRecord,
  runSql,
  visit,
  writeJson,
  readJsonIfExists,
} from "./b-helpers.mjs";

const scenario = "B7.1-users-role-audit";
const stage = process.env.QA_STAGE || "admin";
const targetId = "cp-dashboard-v5-user-staff-016";
const targetEmail = "empleado.016@coldpower.local";
const statePath = artifactPath(scenario, "state.json");

function recordStage(value) {
  writeJson(artifactPath(scenario, `result-${stage}.json`), { scenario, stage, generatedAt: new Date().toISOString(), ...value });
  return resultRecord(scenario, value);
}

function firstRow(query) {
  const line = runSql(query).split(/\r?\n/)[0]?.trim();
  if (!line) throw new Error("No se encontro el registro esperado en PostgreSQL local.");
  return line.split("\t");
}

function sqlString(value) {
  return String(value).replaceAll("'", "''");
}

async function openTargetDetail(page) {
  await visit(page, `/admin/usuarios?query=${encodeURIComponent(targetEmail)}`);
  await page.locator('a[aria-label^="Ver detalle de"]').first().waitFor({ state: "visible", timeout: 15_000 });
  await page.locator('a[aria-label^="Ver detalle de"]').first().click();
  await page.waitForTimeout(1_200);
}

async function chooseUiSelect(page, label, optionName) {
  const control = page.getByRole("button", { name: label, exact: true }).first();
  await control.waitFor({ state: "visible", timeout: 15_000 });
  await control.click();
  const option = page.getByRole("option", { name: optionName, exact: true }).first();
  await option.waitFor({ state: "visible", timeout: 10_000 });
  await option.click();
}

async function changeRoleThroughUi(page, nextRoleLabel, captureLabel) {
  await chooseUiSelect(page, "Rol del usuario", nextRoleLabel);
  const dialog = page.getByRole("alertdialog", { name: "Confirmar cambio de acceso" });
  await dialog.waitFor({ state: "visible", timeout: 10_000 });
  const responsePromise = page
    .waitForResponse((response) => response.url().includes(`/api/admin/usuarios/${targetId}`) && response.request().method() === "PATCH", { timeout: 20_000 })
    .catch(() => null);
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  const response = await responsePromise;
  await page.waitForTimeout(2_000);
  await capture(scenario, captureLabel, page);
  return response ? { status: response.status(), body: await response.text() } : null;
}

async function settleDeniedPage(page) {
  await page.waitForURL(/\/admin\/sin-acceso(?:$|\?)/, { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(300);
}

const session = await createQaBrowser(scenario);
const { page } = session;
const evidence = { scenario, stage, targetId, targetEmail, stages: [] };

try {
  if (stage === "admin") {
    const before = firstRow(`SELECT id,email,role_code,status,clerk_sync_status,clerk_sync_error FROM users WHERE id='${targetId}';`);
    evidence.before = { role: before[2], status: before[3], clerkSyncStatus: before[4], clerkSyncError: before[5] };
    captureSql(scenario, "before", `SELECT id,email,role_code,status,clerk_sync_status,clerk_sync_error,last_role_changed_at FROM users WHERE id='${targetId}'; SELECT action,entity_id,actor_id,actor_role,created_at FROM audit_logs WHERE entity_type='user' AND entity_id='${targetId}' ORDER BY created_at DESC LIMIT 8;`);

    await visit(page, "/admin/usuarios");
    await capture(scenario, "01-users-before", page);
    const invitationEmail = `qa.b71.${Date.now()}@coldpower.pe`;
    evidence.invitationEmail = invitationEmail;
    const invitation = page.locator("#user-invitation");
    const inviteInputs = invitation.locator('input:not([type="hidden"])');
    await inviteInputs.nth(0).fill("QA Staff");
    await inviteInputs.nth(1).fill("B7.1");
    await invitation.getByPlaceholder("empleado@empresa.com").fill(invitationEmail);
    await chooseUiSelect(page, "Rol inicial", "Reportes");
    const invitationResponsePromise = page
      .waitForResponse((response) => response.url().endsWith("/api/admin/usuarios/invitaciones") && response.request().method() === "POST", { timeout: 20_000 })
      .catch(() => null);
    await invitation.getByRole("button", { name: "Invitar", exact: true }).click();
    const invitationResponse = await invitationResponsePromise;
    await page.waitForTimeout(1_500);
    const invitationMessage = await page.locator("#user-invitation [role=alert], #user-invitation [role=status]").allTextContents();
    evidence.invitation = {
      status: invitationResponse?.status() ?? null,
      body: invitationResponse ? await invitationResponse.text() : null,
      message: invitationMessage,
    };
    await capture(scenario, "02-invitation-submitted", page);
    captureSql(scenario, "after-invitation", `SELECT action,entity_id,actor_id,actor_role,created_at,"after" FROM audit_logs WHERE action='access.staff_invitation_created' AND "after"->>'email'='${sqlString(invitationEmail)}' ORDER BY created_at DESC LIMIT 3;`);
    evidence.stages.push({ stage: "invitation_ui_mutation", completed: invitationResponse?.status() === 201, email: invitationEmail, status: invitationResponse?.status() ?? null });

    await openTargetDetail(page);
    await capture(scenario, "03-target-detail-before-role", page);
    const patchResult = await changeRoleThroughUi(page, "Ventas", "04-role-change-submitted");
    const after = firstRow(`SELECT id,email,role_code,status,clerk_sync_status,clerk_sync_error FROM users WHERE id='${targetId}';`);
    evidence.afterRoleAttempt = { role: after[2], status: after[3], clerkSyncStatus: after[4], clerkSyncError: after[5], patchStatus: patchResult?.status ?? null, patchBody: patchResult?.body ?? null };
    captureSql(scenario, "after-role-change", `SELECT id,email,role_code,status,clerk_sync_status,clerk_sync_error,last_role_changed_at FROM users WHERE id='${targetId}'; SELECT action,entity_id,actor_id,actor_role,created_at,"before","after",metadata FROM audit_logs WHERE entity_type='user' AND entity_id='${targetId}' ORDER BY created_at DESC LIMIT 12;`);
    const changed = after[2] === "VENTAS";
    evidence.stages.push({ stage: "role_change_ui_mutation", completed: changed, requestedRole: "VENTAS", persistedRole: after[2], patchStatus: patchResult?.status ?? null });
    writeJson(statePath, { targetId, targetEmail, invitationEmail, invitation: evidence.invitation, previousRole: before[2], requestedRole: "VENTAS", currentRole: after[2], roleChangeCompleted: changed });
    const outcome = changed ? "PHASE_COMPLETED" : "BLOCKED_UI_EXTERNAL_SYNC";
    recordStage({ outcome, nextStage: changed ? "verify" : null, ...evidence });
    console.log(JSON.stringify({ outcome, nextStage: changed ? "verify" : null, ...evidence }, null, 2));
    if (!changed) process.exitCode = 1;
  } else if (stage === "verify-existing") {
    const fixtureId = process.env.QA_VERIFY_USER_ID || "cp-dashboard-v5-user-staff-001";
    const configResponse = await visit(page, "/admin/configuracion");
    await settleDeniedPage(page);
    const configUrl = page.url();
    await capture(scenario, "05-existing-ventas-configuracion-denied", page);
    const usersResponse = await visit(page, "/admin/usuarios");
    await settleDeniedPage(page);
    const usersUrl = page.url();
    await capture(scenario, "06-existing-ventas-usuarios-denied", page);
    const configApi = await probeApi(page, "/api/admin/configuracion");
    const usersApi = await probeApi(page, "/api/admin/usuarios");
    writeJson(artifactPath(scenario, "07-existing-fixture-prohibited-api.json"), { fixtureId, configApi, usersApi });
    captureSql(scenario, "existing-fixture-permissions", `SELECT id,email,role_code,status FROM users WHERE id='${fixtureId}';`);
    evidence.fixtureId = fixtureId;
    evidence.pageChecks = {
      configuration: { status: configResponse?.status() ?? null, finalUrl: configUrl },
      users: { status: usersResponse?.status() ?? null, finalUrl: usersUrl },
    };
    evidence.apiChecks = { configuration: configApi.status, users: usersApi.status };
    const denied = configApi.status === 403 && usersApi.status === 403;
    evidence.stages.push({ stage: "existing_ventas_permission_verification_supplemental", completed: denied, expectedApiStatus: 403 });
    recordStage({ outcome: denied ? "SUPPLEMENTAL_COMPLETED" : "SUPPLEMENTAL_BLOCKED", ...evidence });
    console.log(JSON.stringify({ outcome: denied ? "SUPPLEMENTAL_COMPLETED" : "SUPPLEMENTAL_BLOCKED", ...evidence }, null, 2));
    if (!denied) process.exitCode = 1;
  } else if (stage === "cleanup") {
    const state = readJsonIfExists(statePath);
    if (!state?.invitationEmail) throw new Error("No existe una invitacion QA para limpiar.");
    await visit(page, "/admin/usuarios");
    await page.getByText("Gestionar invitaciones pendientes", { exact: true }).click();
    await page.getByText(state.invitationEmail, { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.waitForTimeout(1_500);
    await capture(scenario, "10-invitation-cancelled", page);
    captureSql(scenario, "after-invitation-cleanup", `SELECT action,entity_id,actor_id,actor_role,created_at,"after" FROM audit_logs WHERE action IN ('access.staff_invitation_created','access.staff_invitation_cancelled') AND ("after"->>'email'='${sqlString(state.invitationEmail)}' OR entity_id=(SELECT entity_id FROM audit_logs WHERE action='access.staff_invitation_created' AND "after"->>'email'='${sqlString(state.invitationEmail)}' ORDER BY created_at DESC LIMIT 1)) ORDER BY created_at DESC LIMIT 5;`);
    evidence.invitationEmail = state.invitationEmail;
    evidence.stages.push({ stage: "invitation_cleanup_ui_mutation", completed: true, action: "cancel" });
    recordStage({ outcome: "COMPLETED", ...evidence });
    console.log(JSON.stringify({ outcome: "COMPLETED", ...evidence }, null, 2));
  } else if (stage === "verify") {
    const state = readJsonIfExists(statePath);
    if (!state?.roleChangeCompleted || state.currentRole !== "VENTAS") throw new Error("El estado no confirma el cambio de rol a VENTAS.");
    const configResponse = await visit(page, "/admin/configuracion");
    await settleDeniedPage(page);
    const configUrl = page.url();
    await capture(scenario, "05-ventas-configuracion-denied", page);
    const usersResponse = await visit(page, "/admin/usuarios");
    await settleDeniedPage(page);
    const usersUrl = page.url();
    await capture(scenario, "06-ventas-usuarios-denied", page);
    const configApi = await probeApi(page, "/api/admin/configuracion");
    const usersApi = await probeApi(page, "/api/admin/usuarios");
    writeJson(artifactPath(scenario, "07-prohibited-api.json"), { configApi, usersApi });
    captureSql(scenario, "verify-role", `SELECT id,email,role_code,status,clerk_sync_status FROM users WHERE id='${targetId}'; SELECT action,entity_id,actor_id,actor_role,created_at FROM audit_logs WHERE entity_type='user' AND entity_id='${targetId}' ORDER BY created_at DESC LIMIT 8;`);
    evidence.currentRole = state.currentRole;
    evidence.pageChecks = {
      configuration: { status: configResponse?.status() ?? null, finalUrl: configUrl },
      users: { status: usersResponse?.status() ?? null, finalUrl: usersUrl },
    };
    evidence.apiChecks = { configuration: configApi.status, users: usersApi.status };
    const denied = configApi.status === 403 && usersApi.status === 403;
    evidence.stages.push({ stage: "role_permissions_ui_and_api_verification", completed: denied, expectedApiStatus: 403 });
    recordStage({ outcome: denied ? "PHASE_COMPLETED" : "BLOCKED_PERMISSION_CHECK", nextStage: "restore", ...evidence });
    console.log(JSON.stringify({ outcome: denied ? "PHASE_COMPLETED" : "BLOCKED_PERMISSION_CHECK", nextStage: "restore", ...evidence }, null, 2));
    if (!denied) process.exitCode = 1;
  } else if (stage === "restore") {
    const state = readJsonIfExists(statePath);
    if (!state?.roleChangeCompleted) throw new Error("No existe un cambio de rol completado para restaurar.");
    await openTargetDetail(page);
    await capture(scenario, "08-target-detail-before-restore", page);
    const patchResult = await changeRoleThroughUi(page, "Reportes", "09-role-restored");
    const after = firstRow(`SELECT id,email,role_code,status,clerk_sync_status,clerk_sync_error FROM users WHERE id='${targetId}';`);
    captureSql(scenario, "after-restore", `SELECT id,email,role_code,status,clerk_sync_status,clerk_sync_error,last_role_changed_at FROM users WHERE id='${targetId}'; SELECT action,entity_id,actor_id,actor_role,created_at,"before","after",metadata FROM audit_logs WHERE entity_type='user' AND entity_id='${targetId}' ORDER BY created_at DESC LIMIT 15;`);
    const restored = after[2] === "REPORTES";
    evidence.afterRestore = { role: after[2], status: after[3], clerkSyncStatus: after[4], clerkSyncError: after[5], patchStatus: patchResult?.status ?? null, patchBody: patchResult?.body ?? null };
    evidence.stages.push({ stage: "role_restore_ui_mutation", completed: restored, requestedRole: "REPORTES", persistedRole: after[2], patchStatus: patchResult?.status ?? null });
    recordStage({ outcome: restored ? "COMPLETED" : "BLOCKED_UI_EXTERNAL_SYNC", ...evidence });
    console.log(JSON.stringify({ outcome: restored ? "COMPLETED" : "BLOCKED_UI_EXTERNAL_SYNC", ...evidence }, null, 2));
    if (!restored) process.exitCode = 1;
  } else {
    throw new Error(`QA_STAGE desconocido: ${stage}`);
  }
} catch (error) {
  await capture(scenario, `error-${stage}`, page).catch(() => undefined);
  writeJson(artifactPath(scenario, `error-${stage}.json`), { error: compactError(error), evidence, browserEvents: session.events });
  recordStage({ outcome: "BLOCKED", error: compactError(error), ...evidence });
  console.log(JSON.stringify({ outcome: "BLOCKED", error: compactError(error), ...evidence }, null, 2));
  process.exitCode = 1;
} finally {
  await closeQaBrowser(session);
}
