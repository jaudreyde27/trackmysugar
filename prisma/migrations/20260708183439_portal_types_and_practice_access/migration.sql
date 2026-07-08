-- CreateEnum
CREATE TYPE "PortalType" AS ENUM ('PRACTICE', 'CDCES');

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "selectedOrganizationId" TEXT;

-- AlterTable
ALTER TABLE "staff_users" ADD COLUMN     "portalType" "PortalType" NOT NULL DEFAULT 'PRACTICE';

-- CreateTable
CREATE TABLE "staff_organization_access" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_organization_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_organization_access_organizationId_idx" ON "staff_organization_access"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_organization_access_staffUserId_organizationId_key" ON "staff_organization_access"("staffUserId", "organizationId");

-- AddForeignKey
ALTER TABLE "staff_organization_access" ADD CONSTRAINT "staff_organization_access_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "staff_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_organization_access" ADD CONSTRAINT "staff_organization_access_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_selectedOrganizationId_fkey" FOREIGN KEY ("selectedOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
