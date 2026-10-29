-- Phase 4: model Device as a physical ESP32 node owned by exactly one Garden.
-- A Device is not assigned to exactly one Pot; readings can still carry potId.

CREATE TYPE "DeviceStatus" AS ENUM ('NEVER_SEEN', 'ONLINE', 'OFFLINE');

ALTER TABLE "Device" DROP CONSTRAINT IF EXISTS "Device_potId_fkey";

ALTER TABLE "Device" DROP COLUMN IF EXISTS "potId";
ALTER TABLE "Device" DROP COLUMN IF EXISTS "scope";

ALTER TABLE "Device" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Device"
ALTER COLUMN "status" TYPE "DeviceStatus"
USING (
  CASE
    WHEN "lastSeenAt" IS NULL THEN 'NEVER_SEEN'::"DeviceStatus"
    WHEN "lastSeenAt" >= NOW() - INTERVAL '2 minutes' THEN 'ONLINE'::"DeviceStatus"
    ELSE 'OFFLINE'::"DeviceStatus"
  END
);
ALTER TABLE "Device" ALTER COLUMN "status" SET DEFAULT 'NEVER_SEEN';

DROP TYPE IF EXISTS "DeviceScope";
