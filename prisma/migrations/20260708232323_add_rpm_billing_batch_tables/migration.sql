-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "billingProviderName" TEXT,
ADD COLUMN     "billingProviderNpi" TEXT,
ADD COLUMN     "billingProviderTaxId" TEXT;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "rpmSetupBilled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supervisingProviderNpi" TEXT;

-- CreateTable
CREATE TABLE "billing_batches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedByStaffUserId" TEXT,

    CONSTRAINT "billing_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpm_billing_lines" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "billingPeriodStart" DATE NOT NULL,
    "billingPeriodEnd" DATE NOT NULL,
    "cptCode" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "diagnosisCode" TEXT NOT NULL,
    "diagnosisPointer" TEXT NOT NULL DEFAULT 'A',
    "placeOfService" TEXT NOT NULL DEFAULT '11',
    "modifier" TEXT,
    "renderingProviderNpi" TEXT,
    "chargeAmount" DECIMAL(10,2),
    "billingProviderName" TEXT,
    "billingProviderNpi" TEXT,
    "billingProviderTaxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rpm_billing_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpm_exclusions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rpm_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_batches_organizationId_periodStart_periodEnd_key" ON "billing_batches"("organizationId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "rpm_billing_lines_patientId_idx" ON "rpm_billing_lines"("patientId");

-- CreateIndex
CREATE INDEX "rpm_billing_lines_batchId_idx" ON "rpm_billing_lines"("batchId");

-- CreateIndex
CREATE INDEX "rpm_exclusions_patientId_idx" ON "rpm_exclusions"("patientId");

-- AddForeignKey
ALTER TABLE "billing_batches" ADD CONSTRAINT "billing_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_batches" ADD CONSTRAINT "billing_batches_generatedByStaffUserId_fkey" FOREIGN KEY ("generatedByStaffUserId") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpm_billing_lines" ADD CONSTRAINT "rpm_billing_lines_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpm_billing_lines" ADD CONSTRAINT "rpm_billing_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpm_billing_lines" ADD CONSTRAINT "rpm_billing_lines_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "billing_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpm_exclusions" ADD CONSTRAINT "rpm_exclusions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpm_exclusions" ADD CONSTRAINT "rpm_exclusions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
