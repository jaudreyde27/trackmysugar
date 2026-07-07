-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "staff_users" ADD COLUMN     "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizationId" TEXT;

-- Backfill: seed one default org and attach every existing patient/staff
-- row to it, so the following NOT NULL constraint on patients has no
-- pre-existing rows left with a null organizationId. Existing staff rows
-- are clinic staff (no platform-admin accounts existed before this
-- migration), so they all get attached too.
INSERT INTO "organizations" ("id", "name", "updatedAt")
VALUES ('clinic_alpine_endocrine', 'Alpine Endocrine Associates', CURRENT_TIMESTAMP);

UPDATE "patients" SET "organizationId" = 'clinic_alpine_endocrine' WHERE "organizationId" IS NULL;
UPDATE "staff_users" SET "organizationId" = 'clinic_alpine_endocrine' WHERE "organizationId" IS NULL;

ALTER TABLE "patients" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "patients_organizationId_idx" ON "patients"("organizationId");

-- CreateIndex
CREATE INDEX "staff_users_organizationId_idx" ON "staff_users"("organizationId");

-- AddForeignKey
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
