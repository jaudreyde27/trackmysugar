/*
  Warnings:

  - Added the required column `primaryDiagnosisCode` to the `patients` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CgmDevice" AS ENUM ('DEXCOM', 'FREESTYLE_LIBRE');

-- CreateEnum
CREATE TYPE "InsulinDeliveryDevice" AS ENUM ('OMNIPOD', 'TANDEM', 'MEDTRONIC', 'MDI');

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "cgmDevice" "CgmDevice",
ADD COLUMN     "insulinDeliveryDevice" "InsulinDeliveryDevice",
ADD COLUMN     "primaryDiagnosisCode" TEXT;

-- Backfill existing rows with a generic default code per diabetes type
-- (E10.9 = Type 1 without complications, E11.9 = Type 2 without complications)
-- so the column can be made NOT NULL without destroying existing data.
-- Update to each patient's actual documented diagnosis afterward.
UPDATE "patients" SET "primaryDiagnosisCode" = CASE
  WHEN "diabetesType" = 'TYPE_1' THEN 'E10.9'
  ELSE 'E11.9'
END WHERE "primaryDiagnosisCode" IS NULL;

ALTER TABLE "patients" ALTER COLUMN "primaryDiagnosisCode" SET NOT NULL;

-- CreateTable
CREATE TABLE "cdces_call_sessions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "talkingPoints" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cdces_call_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cdces_call_sessions_patientId_startedAt_idx" ON "cdces_call_sessions"("patientId", "startedAt");

-- AddForeignKey
ALTER TABLE "cdces_call_sessions" ADD CONSTRAINT "cdces_call_sessions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cdces_call_sessions" ADD CONSTRAINT "cdces_call_sessions_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
