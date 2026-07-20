-- AlterTable
ALTER TABLE "Event" ADD COLUMN "galleryEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "galleryPin" TEXT;

-- CreateEnum
CREATE TYPE "MediaResourceType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "EventMediaLink" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "uploaderName" TEXT NOT NULL,
    "uploaderNameNormalized" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "resourceType" "MediaResourceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventMediaLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventMediaLink_eventId_uploaderNameNormalized_idx" ON "EventMediaLink"("eventId", "uploaderNameNormalized");

-- CreateIndex
CREATE INDEX "EventMediaLink_eventId_createdAt_idx" ON "EventMediaLink"("eventId", "createdAt");

-- AddForeignKey
ALTER TABLE "EventMediaLink" ADD CONSTRAINT "EventMediaLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
