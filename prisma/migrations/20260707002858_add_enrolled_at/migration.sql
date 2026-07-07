/*
  Warnings:

  - Added the required column `enrolledAt` to the `patients` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "enrolledAt" DATE;

-- Backfill existing rows with their record-creation date so the column can
-- be made NOT NULL without destroying existing data. Update to each
-- patient's actual program enrollment date afterward.
UPDATE "patients" SET "enrolledAt" = "createdAt"::date WHERE "enrolledAt" IS NULL;

ALTER TABLE "patients" ALTER COLUMN "enrolledAt" SET NOT NULL;
