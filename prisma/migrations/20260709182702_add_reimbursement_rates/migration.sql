-- CreateTable
CREATE TABLE "reimbursement_rates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cptCode" TEXT NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reimbursement_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reimbursement_rates_organizationId_cptCode_key" ON "reimbursement_rates"("organizationId", "cptCode");

-- AddForeignKey
ALTER TABLE "reimbursement_rates" ADD CONSTRAINT "reimbursement_rates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
