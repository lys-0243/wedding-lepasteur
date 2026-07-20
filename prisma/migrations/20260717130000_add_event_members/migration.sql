-- CreateEnum (idempotent — may already exist from fixtures branch)
DO $$ BEGIN
  CREATE TYPE "EventRole" AS ENUM ('OWNER', 'PROTOCOLE', 'SCANNER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "EventMember" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "EventRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventMember_userId_idx" ON "EventMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EventMember_eventId_userId_key" ON "EventMember"("eventId", "userId");

-- AddForeignKey (ignore if already present)
DO $$ BEGIN
  ALTER TABLE "EventMember" ADD CONSTRAINT "EventMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "EventMember" ADD CONSTRAINT "EventMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Backfill OWNER membership for existing event creators
INSERT INTO "EventMember" ("id", "eventId", "userId", "role", "createdAt", "updatedAt")
SELECT
  md5(e."id" || e."userId" || 'owner')::text,
  e."id",
  e."userId",
  'OWNER',
  NOW(),
  NOW()
FROM "Event" e
WHERE NOT EXISTS (
  SELECT 1 FROM "EventMember" em
  WHERE em."eventId" = e."id" AND em."userId" = e."userId"
);
