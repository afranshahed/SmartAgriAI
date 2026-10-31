-- Non-destructive command-lifecycle upgrade. Existing history is retained.
ALTER TYPE "DeviceCommandStatus" ADD VALUE IF NOT EXISTS 'RETRYING';
ALTER TYPE "DeviceCommandStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "DeviceCommandStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "Pot"
  ADD COLUMN IF NOT EXISTS "commandSequence" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "confirmedCommandSequence" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "DeviceCommand"
  ADD COLUMN IF NOT EXISTS "deliveryAcknowledgedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "executionResultAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sequence" INTEGER NOT NULL DEFAULT 0;

-- Backfill before enforcing NOT NULL. Existing commands retain their original
-- status here because PostgreSQL cannot safely consume a newly added enum
-- value until a later migration transaction.
UPDATE "DeviceCommand"
SET "expiresAt" = COALESCE("expiresAt", CURRENT_TIMESTAMP);

ALTER TABLE "DeviceCommand" ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "DeviceCommand_deviceId_status_nextAttemptAt_idx"
  ON "DeviceCommand"("deviceId", "status", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "DeviceCommand_deviceId_potId_sequence_idx"
  ON "DeviceCommand"("deviceId", "potId", "sequence");
