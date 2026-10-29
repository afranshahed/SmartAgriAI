CREATE TYPE "DeviceCommandType" AS ENUM ('PUMP_ON', 'PUMP_OFF');

CREATE TYPE "DeviceCommandStatus" AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED', 'FAILED');

CREATE TABLE "DeviceCommand" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "gardenId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "potId" TEXT NOT NULL,
  "command" "DeviceCommandType" NOT NULL,
  "status" "DeviceCommandStatus" NOT NULL DEFAULT 'PENDING',
  "mode" "PotIrrigationMode" NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  CONSTRAINT "DeviceCommand_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeviceCommand_deviceId_status_createdAt_idx" ON "DeviceCommand"("deviceId", "status", "createdAt");
CREATE INDEX "DeviceCommand_userId_potId_createdAt_idx" ON "DeviceCommand"("userId", "potId", "createdAt");

ALTER TABLE "DeviceCommand" ADD CONSTRAINT "DeviceCommand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceCommand" ADD CONSTRAINT "DeviceCommand_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceCommand" ADD CONSTRAINT "DeviceCommand_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceCommand" ADD CONSTRAINT "DeviceCommand_potId_fkey" FOREIGN KEY ("potId") REFERENCES "Pot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
