-- CreateEnum
CREATE TYPE "DeviceCategory" AS ENUM ('CGM', 'PUMP');

-- CreateTable
CREATE TABLE "device_history" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "category" "DeviceCategory" NOT NULL,
    "cgmDevice" "CgmDevice",
    "insulinDeliveryDevice" "InsulinDeliveryDevice",
    "startedAt" DATE NOT NULL,
    "endedAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_history_patientId_category_startedAt_idx" ON "device_history"("patientId", "category", "startedAt");

-- AddForeignKey
ALTER TABLE "device_history" ADD CONSTRAINT "device_history_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
