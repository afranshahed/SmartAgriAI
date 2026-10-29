-- Account settings are limited to name, email, and credentials.
-- Garden location and weather coordinates remain stored on the Garden model.
ALTER TABLE "User"
  DROP COLUMN "farmName",
  DROP COLUMN "location",
  DROP COLUMN "cropTypes",
  DROP COLUMN "farmSize",
  DROP COLUMN "lat",
  DROP COLUMN "lng";
