-- CreateEnum
CREATE TYPE "PhoneType" AS ENUM ('MOBILE', 'HOME', 'WORK');

-- CreateEnum
CREATE TYPE "InsuranceRank" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "SubscriberRelationship" AS ENUM ('SELF', 'SPOUSE', 'CHILD', 'OTHER');

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phoneHome" TEXT,
ADD COLUMN     "phoneMobile" TEXT,
ADD COLUMN     "phoneWork" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "preferredPhoneType" "PhoneType",
ADD COLUMN     "state" TEXT;

-- CreateTable
CREATE TABLE "insurance_policies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "rank" "InsuranceRank" NOT NULL,
    "payerName" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "groupNumber" TEXT,
    "planType" TEXT,
    "subscriberName" TEXT,
    "subscriberRelationship" "SubscriberRelationship" NOT NULL DEFAULT 'SELF',
    "effectiveDate" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "insurance_policies_patientId_rank_key" ON "insurance_policies"("patientId", "rank");

-- AddForeignKey
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
