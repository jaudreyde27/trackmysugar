-- CreateEnum
CREATE TYPE "CommunicationMethod" AS ENUM ('SYNCHRONOUS', 'ASYNCHRONOUS');

-- CreateEnum
CREATE TYPE "ReadingSource" AS ENUM ('AUTOMATIC', 'MANUAL');

-- AlterTable
ALTER TABLE "glucose_readings" ADD COLUMN     "readingSource" "ReadingSource" NOT NULL DEFAULT 'AUTOMATIC';

-- AlterTable
ALTER TABLE "monitoring_sessions" ADD COLUMN     "communicationMethod" "CommunicationMethod" NOT NULL DEFAULT 'ASYNCHRONOUS',
ADD COLUMN     "staffCredential" TEXT;

-- AlterTable
ALTER TABLE "staff_users" ADD COLUMN     "credential" TEXT;

-- Backfill: rows that already represent a live call or were flagged
-- two-way get reclassified as SYNCHRONOUS; the column default
-- (ASYNCHRONOUS) already covers everything else.
UPDATE "monitoring_sessions" SET "communicationMethod" = 'SYNCHRONOUS' WHERE "source" = 'CALL' OR "twoWayCommunication" = true;
