-- CreateTable
CREATE TABLE "EventDrink" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "drinkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventDrink_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventDrink" ADD CONSTRAINT "EventDrink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDrink" ADD CONSTRAINT "EventDrink_drinkId_fkey" FOREIGN KEY ("drinkId") REFERENCES "Drink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill current event-drink relations from legacy event-scoped Drink rows
INSERT INTO "EventDrink" ("id", "eventId", "drinkId", "createdAt")
SELECT
  'ed_' || substr(md5(d."eventId" || ':' || d."id"), 1, 24),
  d."eventId",
  d."id",
  CURRENT_TIMESTAMP
FROM "Drink" d;

-- Merge duplicate drinks across events by (name, isAlcoholic)
WITH canonical AS (
  SELECT
    MIN("id") AS canonical_id,
    "name",
    "isAlcoholic"
  FROM "Drink"
  GROUP BY "name", "isAlcoholic"
)
UPDATE "GuestDrink" gd
SET "drinkId" = c.canonical_id
FROM "Drink" d
JOIN canonical c
  ON c."name" = d."name"
 AND c."isAlcoholic" = d."isAlcoholic"
WHERE gd."drinkId" = d."id";

WITH canonical AS (
  SELECT
    MIN("id") AS canonical_id,
    "name",
    "isAlcoholic"
  FROM "Drink"
  GROUP BY "name", "isAlcoholic"
)
UPDATE "EventDrink" ed
SET "drinkId" = c.canonical_id
FROM "Drink" d
JOIN canonical c
  ON c."name" = d."name"
 AND c."isAlcoholic" = d."isAlcoholic"
WHERE ed."drinkId" = d."id";

-- Remove duplicate event selections created by canonical mapping
DELETE FROM "EventDrink" ed
USING "EventDrink" dup
WHERE ed.ctid < dup.ctid
  AND ed."eventId" = dup."eventId"
  AND ed."drinkId" = dup."drinkId";

-- Delete non-canonical drink duplicates
DELETE FROM "Drink" d
USING (
  SELECT
    "id",
    MIN("id") OVER (PARTITION BY "name", "isAlcoholic") AS canonical_id
  FROM "Drink"
) m
WHERE d."id" = m."id"
  AND m."id" <> m.canonical_id;

-- Drop old event-scoped relation and uniqueness
DROP INDEX IF EXISTS "Drink_eventId_name_key";
ALTER TABLE "Drink" DROP CONSTRAINT IF EXISTS "Drink_eventId_fkey";
ALTER TABLE "Drink" DROP COLUMN IF EXISTS "eventId";

-- Image is now optional
ALTER TABLE "Drink" ALTER COLUMN "imageUrl" DROP NOT NULL;
ALTER TABLE "Drink" ALTER COLUMN "imageUrl" DROP DEFAULT;

-- New global uniqueness
CREATE UNIQUE INDEX "Drink_name_isAlcoholic_key" ON "Drink"("name", "isAlcoholic");

-- EventDrink indexes and uniqueness
CREATE INDEX "EventDrink_eventId_idx" ON "EventDrink"("eventId");
CREATE INDEX "EventDrink_drinkId_idx" ON "EventDrink"("drinkId");
CREATE UNIQUE INDEX "EventDrink_eventId_drinkId_key" ON "EventDrink"("eventId", "drinkId");
