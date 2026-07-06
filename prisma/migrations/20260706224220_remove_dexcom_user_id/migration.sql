/*
  Warnings:

  - You are about to drop the column `dexcomUserId` on the `dexcom_connections` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "dexcom_connections" DROP COLUMN "dexcomUserId";
