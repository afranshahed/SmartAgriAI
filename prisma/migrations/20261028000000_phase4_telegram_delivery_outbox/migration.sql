CREATE TYPE "TelegramDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

CREATE TYPE "TelegramDeliveryEventType" AS ENUM ('PUMP_ACKNOWLEDGED', 'PUMP_FAILED', 'DISEASE_ANALYSIS_COMPLETED');

CREATE TABLE "TelegramDelivery" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "eventType" "TelegramDeliveryEventType" NOT NULL,
  "eventRef" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'telegram',
  "destinationRef" TEXT NOT NULL DEFAULT 'configured-default',
  "messageText" TEXT NOT NULL,
  "status" "TelegramDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastErrorCode" TEXT,
  "providerMessageId" TEXT,
  "lastAttemptAt" TIMESTAMP(3),
  "leaseExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "TelegramDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramDelivery_eventKey_key" ON "TelegramDelivery"("eventKey");
CREATE INDEX "TelegramDelivery_status_nextAttemptAt_idx" ON "TelegramDelivery"("status", "nextAttemptAt");
CREATE INDEX "TelegramDelivery_status_leaseExpiresAt_idx" ON "TelegramDelivery"("status", "leaseExpiresAt");
CREATE INDEX "TelegramDelivery_userId_createdAt_idx" ON "TelegramDelivery"("userId", "createdAt");

ALTER TABLE "TelegramDelivery" ADD CONSTRAINT "TelegramDelivery_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
