-- Require every Plant to belong to a Pot. Existing unassigned plants are moved
-- into one migration-created fallback pot per garden.
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
  'pot_migrated_' || md5(p."gardenId"),
  p."userId",
  p."gardenId",
  'Unassigned Pot',
  'loam',
  'active',
  NOW(),
  NOW()
FROM "Plant" p
WHERE p."potId" IS NULL
GROUP BY p."userId", p."gardenId"
ON CONFLICT ("gardenId", "label") DO NOTHING;

UPDATE "Plant" p
SET "potId" = COALESCE(existing."id", created."id")
FROM "Garden" g
LEFT JOIN "Pot" existing
  ON existing."gardenId" = g."id"
  AND existing."label" = 'Unassigned Pot'
LEFT JOIN "Pot" created
  ON created."id" = 'pot_migrated_' || md5(g."id")
WHERE p."potId" IS NULL
  AND p."gardenId" = g."id";

ALTER TABLE "Plant" DROP CONSTRAINT "Plant_potId_fkey";

ALTER TABLE "Plant" ALTER COLUMN "potId" SET NOT NULL;

ALTER TABLE "Plant"
ADD CONSTRAINT "Plant_potId_fkey"
FOREIGN KEY ("potId") REFERENCES "Pot"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Plant_userId_gardenId_potId_idx" ON "Plant"("userId", "gardenId", "potId");
