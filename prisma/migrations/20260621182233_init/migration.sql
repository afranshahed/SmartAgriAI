-- CreateEnum
CREATE TYPE "GardenType" AS ENUM ('outdoor', 'greenhouse', 'indoor', 'hydroponic');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "SoilType" AS ENUM ('loam', 'clay', 'sandy', 'silt', 'peat', 'potting_mix');

-- CreateEnum
CREATE TYPE "GrowthStage" AS ENUM ('seedling', 'vegetative', 'flowering', 'fruiting', 'mature', 'harvested');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('healthy', 'at_risk', 'diseased', 'recovering', 'unknown');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('esp32_node', 'dht22', 'dht11', 'soil_moisture', 'rain', 'ldr', 'water_flow', 'solenoid_valve', 'camera');

-- CreateEnum
CREATE TYPE "DeviceScope" AS ENUM ('garden', 'pot');

-- CreateEnum
CREATE TYPE "Metric" AS ENUM ('soil_moisture', 'temperature', 'humidity', 'rain', 'light', 'valve_state', 'brightness', 'height');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "DiseaseStatus" AS ENUM ('active', 'treated', 'resolved');

-- CreateEnum
CREATE TYPE "IrrigationMode" AS ENUM ('manual', 'scheduled', 'automatic', 'ai_recommended');

-- CreateEnum
CREATE TYPE "IrrigationStatus" AS ENUM ('on', 'off');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('info', 'warning', 'alert', 'system');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('unread', 'read');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('irrigation', 'fertilizer', 'pesticide', 'inspection');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'done', 'skipped');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "userName" TEXT,
    "farmName" TEXT,
    "location" TEXT,
    "cropTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "farmSize" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Garden" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GardenType" NOT NULL DEFAULT 'outdoor',
    "location" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "status" "ResourceStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Garden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gardenId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sizeCm" DOUBLE PRECISION,
    "soilType" "SoilType" NOT NULL DEFAULT 'loam',
    "position" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gardenId" TEXT NOT NULL,
    "potId" TEXT,
    "commonName" TEXT NOT NULL,
    "scientificName" TEXT,
    "variety" TEXT,
    "plantedAt" TIMESTAMP(3),
    "growthStage" "GrowthStage" NOT NULL DEFAULT 'seedling',
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'unknown',
    "expectedHarvestAt" TIMESTAMP(3),
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gardenId" TEXT NOT NULL,
    "potId" TEXT,
    "hardwareId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL DEFAULT 'esp32_node',
    "scope" "DeviceScope" NOT NULL DEFAULT 'garden',
    "apiKeyHash" TEXT NOT NULL,
    "pin" TEXT,
    "model" TEXT,
    "firmwareVersion" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'active',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reading" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gardenId" TEXT NOT NULL,
    "potId" TEXT,
    "deviceId" TEXT NOT NULL,
    "hardwareId" TEXT NOT NULL,
    "metric" "Metric" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "quality" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiseaseReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plantId" TEXT,
    "cropName" TEXT,
    "diseaseName" TEXT NOT NULL,
    "className" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "severity" "Severity" NOT NULL DEFAULT 'low',
    "symptoms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "treatmentImmediate" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "treatmentOrganic" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "treatmentChemical" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "treatmentPrevention" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendation" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "healthScoreContribution" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "status" "DiseaseStatus" NOT NULL DEFAULT 'active',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DiseaseReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IrrigationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gardenId" TEXT,
    "potId" TEXT,
    "mode" "IrrigationMode" NOT NULL DEFAULT 'automatic',
    "status" "IrrigationStatus" NOT NULL,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "amountMl" DOUBLE PRECISION,
    "durationSeconds" INTEGER,
    "reason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "IrrigationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IrrigationConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "thresholdPercent" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "currentStatus" "IrrigationStatus" NOT NULL DEFAULT 'off',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IrrigationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantThreshold" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "tempDayMin" DOUBLE PRECISION,
    "tempDayMax" DOUBLE PRECISION,
    "tempNightMin" DOUBLE PRECISION,
    "tempNightMax" DOUBLE PRECISION,
    "humidityMin" DOUBLE PRECISION,
    "humidityMax" DOUBLE PRECISION,
    "lightMin" DOUBLE PRECISION,
    "lightMax" DOUBLE PRECISION,
    "soilMoistureMin" DOUBLE PRECISION DEFAULT 30,
    "soilMoistureMax" DOUBLE PRECISION DEFAULT 70,

    CONSTRAINT "PlantThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gardenId" TEXT,
    "potId" TEXT,
    "startTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "days" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gardenId" TEXT,
    "potId" TEXT,
    "plantId" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'info',
    "severity" "Severity" NOT NULL DEFAULT 'low',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'unread',
    "actionUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Garden_userId_status_idx" ON "Garden"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Garden_userId_name_key" ON "Garden"("userId", "name");

-- CreateIndex
CREATE INDEX "Pot_userId_gardenId_status_idx" ON "Pot"("userId", "gardenId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Pot_gardenId_label_key" ON "Pot"("gardenId", "label");

-- CreateIndex
CREATE INDEX "Plant_userId_gardenId_healthStatus_idx" ON "Plant"("userId", "gardenId", "healthStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Device_hardwareId_key" ON "Device"("hardwareId");

-- CreateIndex
CREATE INDEX "Device_userId_gardenId_status_idx" ON "Device"("userId", "gardenId", "status");

-- CreateIndex
CREATE INDEX "Reading_deviceId_metric_recordedAt_idx" ON "Reading"("deviceId", "metric", "recordedAt");

-- CreateIndex
CREATE INDEX "Reading_gardenId_recordedAt_idx" ON "Reading"("gardenId", "recordedAt");

-- CreateIndex
CREATE INDEX "Reading_userId_metric_recordedAt_idx" ON "Reading"("userId", "metric", "recordedAt");

-- CreateIndex
CREATE INDEX "DiseaseReport_userId_status_detectedAt_idx" ON "DiseaseReport"("userId", "status", "detectedAt");

-- CreateIndex
CREATE INDEX "DiseaseReport_plantId_detectedAt_idx" ON "DiseaseReport"("plantId", "detectedAt");

-- CreateIndex
CREATE INDEX "IrrigationEvent_userId_startedAt_idx" ON "IrrigationEvent"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "IrrigationEvent_gardenId_startedAt_idx" ON "IrrigationEvent"("gardenId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IrrigationConfig_userId_key" ON "IrrigationConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlantThreshold_plantId_key" ON "PlantThreshold"("plantId");

-- CreateIndex
CREATE INDEX "Schedule_userId_idx" ON "Schedule"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_status_createdAt_idx" ON "Notification"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Task_plantId_status_idx" ON "Task"("plantId", "status");

-- AddForeignKey
ALTER TABLE "Garden" ADD CONSTRAINT "Garden_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pot" ADD CONSTRAINT "Pot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pot" ADD CONSTRAINT "Pot_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_potId_fkey" FOREIGN KEY ("potId") REFERENCES "Pot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_potId_fkey" FOREIGN KEY ("potId") REFERENCES "Pot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_potId_fkey" FOREIGN KEY ("potId") REFERENCES "Pot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiseaseReport" ADD CONSTRAINT "DiseaseReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiseaseReport" ADD CONSTRAINT "DiseaseReport_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IrrigationEvent" ADD CONSTRAINT "IrrigationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IrrigationEvent" ADD CONSTRAINT "IrrigationEvent_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IrrigationEvent" ADD CONSTRAINT "IrrigationEvent_potId_fkey" FOREIGN KEY ("potId") REFERENCES "Pot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IrrigationConfig" ADD CONSTRAINT "IrrigationConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantThreshold" ADD CONSTRAINT "PlantThreshold_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
