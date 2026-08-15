ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "module" text;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "severity" text NOT NULL DEFAULT 'INFO';
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "origin" text;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "request_id" text;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "correlation_id" text;
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "audit_logs_severity_idx" ON "audit_logs" ("severity");
CREATE INDEX IF NOT EXISTS "audit_logs_actor_idx" ON "audit_logs" ("actor_id");
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_LOG_APPEND_ONLY';
END;
$$;
DROP TRIGGER IF EXISTS audit_logs_append_only ON "audit_logs";
CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
