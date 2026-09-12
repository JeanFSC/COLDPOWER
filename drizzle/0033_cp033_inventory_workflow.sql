DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "transfers"
    WHERE "status"::text IN ('APPROVED', 'PREPARED')
  ) THEN
    RAISE EXCEPTION 'CP-033: no se puede canonicalizar transfer_status mientras existan traslados APPROVED/PREPARED';
  END IF;
END $$;

ALTER TABLE "transfers" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "transfer_status" RENAME TO "transfer_status_legacy";
CREATE TYPE "transfer_status" AS ENUM('DRAFT', 'REQUESTED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');
ALTER TABLE "transfers"
  ALTER COLUMN "status" TYPE "transfer_status"
  USING "status"::text::"transfer_status";
ALTER TABLE "transfers" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
DROP TYPE "transfer_status_legacy";
