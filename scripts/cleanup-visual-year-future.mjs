import fs from "node:fs";
import { spawnSync } from "node:child_process";

const confirm = process.argv.includes("--confirm-local");
if (!confirm) throw new Error("Usa --confirm-local para limpiar únicamente la base local.");

const envText = fs.readFileSync(".env.localdb", "utf8");
const databaseUrl = envText.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "");
if (!databaseUrl) throw new Error(".env.localdb no contiene DATABASE_URL.");
const url = new URL(databaseUrl);
if (!(url.hostname === "127.0.0.1" || url.hostname === "localhost") || (url.port && url.port !== "5433")) {
  throw new Error(`Refusing non-local database host: ${url.hostname}:${url.port || "5432"}`);
}
if (url.pathname !== "/coldpower") throw new Error(`Refusing database ${url.pathname}; expected /coldpower.`);

const fixture = process.env.CP_VISUAL_FIXTURE ?? "cp-visual-year-2026";
const sql = `
DO $$
DECLARE
  cutoff timestamptz := now();
  fixture_prefix text := '${fixture.replaceAll("'", "''")}%';
  touched integer := 0;
BEGIN
  -- audit_logs is append-only in normal operation. This temporary trigger
  -- suspension is allowed only behind the local-host guard above so stale
  -- development fixture rows can be removed without weakening production.
  ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_append_only;
  DELETE FROM audit_logs WHERE correlation_id LIKE fixture_prefix AND created_at > cutoff;
  GET DIAGNOSTICS touched = ROW_COUNT;
  RAISE NOTICE 'audit_logs ajustadas: %', touched;
  ALTER TABLE audit_logs ENABLE TRIGGER audit_logs_append_only;
  UPDATE quotes SET created_at = LEAST(created_at, cutoff), updated_at = LEAST(updated_at, cutoff), valid_until = LEAST(valid_until, cutoff) WHERE id LIKE fixture_prefix;
  UPDATE quote_items SET created_at = LEAST(created_at, cutoff), updated_at = LEAST(updated_at, cutoff) WHERE id LIKE fixture_prefix;
  UPDATE quote_status_history SET created_at = LEAST(created_at, cutoff) WHERE id LIKE fixture_prefix;
  UPDATE opportunities SET created_at = LEAST(created_at, cutoff), updated_at = LEAST(updated_at, cutoff), last_contact_at = LEAST(last_contact_at, cutoff), follow_up_at = LEAST(follow_up_at, cutoff) WHERE id LIKE fixture_prefix;
  UPDATE opportunity_items SET created_at = LEAST(created_at, cutoff) WHERE id LIKE fixture_prefix;
  UPDATE opportunity_stage_history SET created_at = LEAST(created_at, cutoff) WHERE id LIKE fixture_prefix;
  UPDATE sales SET created_at = LEAST(created_at, cutoff), updated_at = LEAST(updated_at, cutoff), invoice_issued_at = LEAST(invoice_issued_at, cutoff) WHERE id LIKE fixture_prefix;
  UPDATE sale_items SET created_at = LEAST(created_at, cutoff) WHERE id LIKE fixture_prefix;
  UPDATE orders SET created_at = LEAST(created_at, cutoff), updated_at = LEAST(updated_at, cutoff), cancelled_at = LEAST(cancelled_at, cutoff), delivered_at = LEAST(delivered_at, cutoff) WHERE id LIKE fixture_prefix;
  UPDATE order_items SET created_at = LEAST(created_at, cutoff), picked_at = LEAST(picked_at, cutoff) WHERE id LIKE fixture_prefix;
  UPDATE order_status_history SET created_at = LEAST(created_at, cutoff) WHERE id LIKE fixture_prefix;
  UPDATE payments SET created_at = LEAST(created_at, cutoff), updated_at = LEAST(updated_at, cutoff) WHERE id LIKE fixture_prefix;
  UPDATE payment_status_history SET created_at = LEAST(created_at, cutoff) WHERE id LIKE fixture_prefix;
  UPDATE crm_activities SET occurred_at = LEAST(occurred_at, cutoff), next_action_at = LEAST(next_action_at, cutoff), created_at = LEAST(created_at, cutoff), due_at = LEAST(due_at, cutoff), completed_at = LEAST(completed_at, cutoff) WHERE id LIKE fixture_prefix;
  UPDATE crm_tasks SET created_at = LEAST(created_at, cutoff), updated_at = LEAST(updated_at, cutoff), due_at = LEAST(due_at, cutoff), completed_at = LEAST(completed_at, cutoff) WHERE id LIKE fixture_prefix;
END $$;
`;

const result = spawnSync("C:/PostgreSQL/18/bin/psql.exe", ["-h", url.hostname, "-p", url.port || "5433", "-U", decodeURIComponent(url.username), "-d", url.pathname.slice(1), "-v", "ON_ERROR_STOP=1", "-c", sql], {
  env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
  stdio: "inherit",
  shell: false,
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
