CREATE TABLE "DiseasePrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gardenId" TEXT NOT NULL,
    "potId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "imageRef" TEXT NOT NULL,
    "imageMimeType" TEXT NOT NULL,
    "predictedDisease" TEXT NOT NULL,
    "className" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiseasePrediction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DiseasePrediction_userId_plantId_createdAt_idx"
ON "DiseasePrediction"("userId", "plantId", "createdAt");

CREATE INDEX "DiseasePrediction_userId_gardenId_potId_createdAt_idx"
ON "DiseasePrediction"("userId", "gardenId", "potId", "createdAt");

ALTER TABLE "DiseasePrediction" ADD CONSTRAINT "DiseasePrediction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiseasePrediction" ADD CONSTRAINT "DiseasePrediction_gardenId_fkey"
FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiseasePrediction" ADD CONSTRAINT "DiseasePrediction_potId_fkey"
FOREIGN KEY ("potId") REFERENCES "Pot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiseasePrediction" ADD CONSTRAINT "DiseasePrediction_plantId_fkey"
FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
