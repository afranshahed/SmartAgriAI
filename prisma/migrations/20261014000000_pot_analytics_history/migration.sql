CREATE TABLE "DevicePotMapping" (
  "id" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "potId" TEXT NOT NULL,
  "sensorChannel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DevicePotMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DevicePotMapping_deviceId_potId_key" ON "DevicePotMapping"("deviceId", "potId");
CREATE UNIQUE INDEX "DevicePotMapping_deviceId_sensorChannel_key" ON "DevicePotMapping"("deviceId", "sensorChannel");
CREATE INDEX "DevicePotMapping_potId_idx" ON "DevicePotMapping"("potId");
ALTER TABLE "DevicePotMapping" ADD CONSTRAINT "DevicePotMapping_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevicePotMapping" ADD CONSTRAINT "DevicePotMapping_potId_fkey" FOREIGN KEY ("potId") REFERENCES "Pot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WeatherSnapshot" (
  "id" TEXT NOT NULL, "gardenId" TEXT NOT NULL, "temperature" DOUBLE PRECISION,
  "humidity" DOUBLE PRECISION, "precipitation" DOUBLE PRECISION, "rainProbability" DOUBLE PRECISION,
  "windSpeed" DOUBLE PRECISION, "condition" TEXT, "uvIndex" DOUBLE PRECISION,
  "provider" TEXT NOT NULL, "observedAt" TIMESTAMP(3) NOT NULL, "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeatherSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WeatherSnapshot_gardenId_observedAt_idx" ON "WeatherSnapshot"("gardenId", "observedAt");
ALTER TABLE "WeatherSnapshot" ADD CONSTRAINT "WeatherSnapshot_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PumpEvent" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "gardenId" TEXT NOT NULL, "potId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL, "commandId" TEXT, "previousState" "IrrigationStatus" NOT NULL,
  "newState" "IrrigationStatus" NOT NULL, "source" "PotIrrigationMode" NOT NULL,
  "status" "DeviceCommandStatus" NOT NULL, "failureReason" TEXT, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PumpEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PumpEvent_userId_potId_occurredAt_idx" ON "PumpEvent"("userId", "potId", "occurredAt");
CREATE INDEX "PumpEvent_gardenId_occurredAt_idx" ON "PumpEvent"("gardenId", "occurredAt");
ALTER TABLE "PumpEvent" ADD CONSTRAINT "PumpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PumpEvent" ADD CONSTRAINT "PumpEvent_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PumpEvent" ADD CONSTRAINT "PumpEvent_potId_fkey" FOREIGN KEY ("potId") REFERENCES "Pot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PumpEvent" ADD CONSTRAINT "PumpEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PumpEvent" ADD CONSTRAINT "PumpEvent_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "DeviceCommand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IrrigationEvent" ADD COLUMN "soilMoisture" DOUBLE PRECISION;
ALTER TABLE "IrrigationEvent" ADD COLUMN "onThreshold" DOUBLE PRECISION;
ALTER TABLE "IrrigationEvent" ADD COLUMN "offThreshold" DOUBLE PRECISION;
ALTER TABLE "IrrigationEvent" ADD COLUMN "decision" TEXT;
ALTER TABLE "IrrigationEvent" ADD COLUMN "outcome" TEXT;
ALTER TABLE "DeviceCommand" ADD COLUMN "decisionMoisture" DOUBLE PRECISION;
ALTER TABLE "DeviceCommand" ADD COLUMN "onThreshold" DOUBLE PRECISION;
ALTER TABLE "DeviceCommand" ADD COLUMN "offThreshold" DOUBLE PRECISION;
