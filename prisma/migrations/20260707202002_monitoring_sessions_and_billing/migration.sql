-- CreateEnum
CREATE TYPE "MonitoringSessionSource" AS ENUM ('CALL', 'NOTE', 'MANUAL');

-- Rename cdces_call_sessions -> monitoring_sessions, preserving data/ids/FKs.
ALTER TABLE "cdces_call_sessions" RENAME TO "monitoring_sessions";
ALTER TABLE "monitoring_sessions" RENAME CONSTRAINT "cdces_call_sessions_pkey" TO "monitoring_sessions_pkey";
ALTER TABLE "monitoring_sessions" RENAME CONSTRAINT "cdces_call_sessions_patientId_fkey" TO "monitoring_sessions_patientId_fkey";
ALTER TABLE "monitoring_sessions" RENAME CONSTRAINT "cdces_call_sessions_staffUserId_fkey" TO "monitoring_sessions_staffUserId_fkey";
DROP INDEX "cdces_call_sessions_patientId_startedAt_idx";

-- New columns on monitoring_sessions
ALTER TABLE "monitoring_sessions"
  ADD COLUMN "source" "MonitoringSessionSource" NOT NULL DEFAULT 'NOTE',
  ADD COLUMN "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "templateUsed" TEXT,
  ADD COLUMN "twoWayCommunication" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "monitoring_sessions" ALTER COLUMN "startedAt" DROP NOT NULL;
ALTER TABLE "monitoring_sessions" ALTER COLUMN "startedAt" DROP DEFAULT;

-- Backfill: every existing row came from the old live-call-only flow.
UPDATE "monitoring_sessions"
SET
  "source" = 'CALL',
  "occurredAt" = "startedAt",
  "durationSeconds" = CASE
    WHEN "endedAt" IS NOT NULL THEN GREATEST(0, FLOOR(EXTRACT(EPOCH FROM ("endedAt" - "startedAt"))))::INTEGER
    ELSE 0
  END;

-- CreateIndex
CREATE INDEX "monitoring_sessions_patientId_occurredAt_idx" ON "monitoring_sessions"("patientId", "occurredAt");
CREATE INDEX "monitoring_sessions_patientId_source_endedAt_idx" ON "monitoring_sessions"("patientId", "source", "endedAt");

-- AlterTable: Patient — new provider/consent/billing fields
ALTER TABLE "patients"
  ADD COLUMN "supervisingProviderName" TEXT,
  ADD COLUMN "careManagerName" TEXT,
  ADD COLUMN "clinicalNotes" TEXT,
  ADD COLUMN "cpt99453CompletedAt" TIMESTAMP(3),
  ADD COLUMN "consentDate" DATE;

-- AlterTable: DeviceHistory — serial number
ALTER TABLE "device_history" ADD COLUMN "serialNumber" TEXT;

-- AlterTable: Organization — consent template
ALTER TABLE "organizations" ADD COLUMN "rpmConsentTemplate" TEXT;

-- CreateTable
CREATE TABLE "billing_period_statuses" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "markedBilledAt" TIMESTAMP(3),
    "markedBilledByStaffUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_period_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_period_statuses_patientId_year_month_key" ON "billing_period_statuses"("patientId", "year", "month");

-- AddForeignKey
ALTER TABLE "billing_period_statuses" ADD CONSTRAINT "billing_period_statuses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_period_statuses" ADD CONSTRAINT "billing_period_statuses_markedBilledByStaffUserId_fkey" FOREIGN KEY ("markedBilledByStaffUserId") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
