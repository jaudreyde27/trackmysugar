-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'CLINICIAN');

-- CreateEnum
CREATE TYPE "DiabetesType" AS ENUM ('TYPE_1', 'TYPE_2');

-- CreateEnum
CREATE TYPE "DexcomEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'REVOKED');

-- CreateEnum
CREATE TYPE "SyncRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "EgvTrend" AS ENUM ('NONE', 'DOUBLE_UP', 'SINGLE_UP', 'FORTY_FIVE_UP', 'FLAT', 'FORTY_FIVE_DOWN', 'SINGLE_DOWN', 'DOUBLE_DOWN', 'NOT_COMPUTABLE', 'RATE_OUT_OF_RANGE');

-- CreateTable
CREATE TABLE "staff_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'CLINICIAN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "diabetesType" "DiabetesType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dexcom_connections" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "environment" "DexcomEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "dexcomUserId" TEXT,
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "lastSyncAttemptAt" TIMESTAMP(3),
    "lastSyncSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "connectedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dexcom_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "glucose_readings" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "systemTime" TIMESTAMP(3) NOT NULL,
    "displayTime" TIMESTAMP(3) NOT NULL,
    "value" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'mg/dL',
    "trend" "EgvTrend" NOT NULL DEFAULT 'NONE',
    "trendRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "glucose_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_days" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hasData" BOOLEAN NOT NULL DEFAULT false,
    "readingCount" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "SyncRunStatus" NOT NULL DEFAULT 'RUNNING',
    "patientsProcessed" INTEGER NOT NULL DEFAULT 0,
    "patientsSucceeded" INTEGER NOT NULL DEFAULT 0,
    "patientsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT,
    "patientId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_email_key" ON "staff_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_staffUserId_idx" ON "sessions"("staffUserId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_mrn_key" ON "patients"("mrn");

-- CreateIndex
CREATE UNIQUE INDEX "dexcom_connections_patientId_key" ON "dexcom_connections"("patientId");

-- CreateIndex
CREATE INDEX "glucose_readings_patientId_displayTime_idx" ON "glucose_readings"("patientId", "displayTime");

-- CreateIndex
CREATE UNIQUE INDEX "glucose_readings_patientId_systemTime_key" ON "glucose_readings"("patientId", "systemTime");

-- CreateIndex
CREATE INDEX "sync_days_patientId_date_idx" ON "sync_days"("patientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "sync_days_patientId_date_key" ON "sync_days"("patientId", "date");

-- CreateIndex
CREATE INDEX "audit_logs_staffUserId_idx" ON "audit_logs"("staffUserId");

-- CreateIndex
CREATE INDEX "audit_logs_patientId_idx" ON "audit_logs"("patientId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "staff_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dexcom_connections" ADD CONSTRAINT "dexcom_connections_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_days" ADD CONSTRAINT "sync_days_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
