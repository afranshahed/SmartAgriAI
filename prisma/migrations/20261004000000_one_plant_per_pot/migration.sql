-- Enforce the Phase 3 hierarchy:
-- Garden -> Pot -> zero or one Plant.
--
-- Existing data is preserved. If multiple plants currently point at the same
-- pot, the first plant keeps that pot and each additional plant is moved to a
-- migration-created pot in the same garden.

WITH mismatched AS (
  SELECT
    p."id" AS "plantId",
    p."userId",
    p."gardenId",
    p."commonName"
  FROM "Plant" p
  JOIN "Pot" pot ON pot."id" = p."potId"
  WHERE pot."gardenId" <> p."gardenId"
),
inserted_mismatch_pots AS (
  INSERT INTO "Pot" (
    "id",
    "userId",
    "gardenId",
    "label",
    "soilType",
    "status",
    "createdAt",
    "updatedAt"
  )
  SELECT
    'pot_mismatch_' || md5(m."plantId"),
    m."userId",
    m."gardenId",
    'Migrated Plant Pot ' || left(md5(m."plantId"), 8),
    'loam',
    'active',
    NOW(),
    NOW()
  FROM mismatched m
  ON CONFLICT ("gardenId", "label") DO NOTHING
  RETURNING "id"
)
UPDATE "Plant" p
SET "potId" = 'pot_mismatch_' || md5(p."id")
WHERE p."id" IN (SELECT "plantId" FROM mismatched);

WITH ranked AS (
  SELECT
    p."id" AS "plantId",
    p."userId",
    p."gardenId",
    ROW_NUMBER() OVER (
      PARTITION BY p."potId"
      ORDER BY p."createdAt" ASC, p."id" ASC
    ) AS rn
  FROM "Plant" p
),
duplicates AS (
  SELECT *
  FROM ranked
  WHERE rn > 1
),
inserted_duplicate_pots AS (
  INSERT INTO "Pot" (
    "id",
    "userId",
    "gardenId",
    "label",
    "soilType",
    "status",
    "createdAt",
    "updatedAt"
  )
  SELECT
    'pot_overflow_' || md5(d."plantId"),
    d."userId",
    d."gardenId",
    'Migrated Plant Pot ' || left(md5(d."plantId"), 8),
    'loam',
    'active',
    NOW(),
    NOW()
  FROM duplicates d
  ON CONFLICT ("gardenId", "label") DO NOTHING
  RETURNING "id"
)
UPDATE "Plant" p
SET "potId" = 'pot_overflow_' || md5(p."id")
WHERE p."id" IN (SELECT "plantId" FROM duplicates);

DROP INDEX IF EXISTS "Plant_userId_gardenId_potId_idx";

CREATE UNIQUE INDEX "Plant_potId_key" ON "Plant"("potId");

CREATE INDEX "Plant_userId_gardenId_potId_idx" ON "Plant"("userId", "gardenId", "potId");
