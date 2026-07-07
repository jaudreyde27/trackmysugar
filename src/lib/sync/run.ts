import { prisma } from "@/lib/db";
import { fetchEgvs, mapDexcomTrend } from "@/lib/dexcom/client";
import { getValidAccessToken } from "@/lib/dexcom/connection";

function yesterdayUtcRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { date: start, start, end };
}

export type DailySyncSummary = {
  syncRunId: string;
  patientsProcessed: number;
  patientsSucceeded: number;
  patientsFailed: number;
};

export async function runDailySync(): Promise<DailySyncSummary> {
  const syncRun = await prisma.syncRun.create({ data: {} });

  const { date, start, end } = yesterdayUtcRange();

  const connections = await prisma.dexcomConnection.findMany({
    where: { status: "ACTIVE" },
  });

  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const connection of connections) {
    await prisma.dexcomConnection.update({
      where: { id: connection.id },
      data: { lastSyncAttemptAt: new Date() },
    });

    try {
      const accessToken = await getValidAccessToken(connection);
      const { records: egvs } = await fetchEgvs(accessToken, start, end);

      for (const egv of egvs) {
        await prisma.glucoseReading.upsert({
          where: {
            patientId_systemTime: {
              patientId: connection.patientId,
              systemTime: new Date(egv.systemTime),
            },
          },
          create: {
            patientId: connection.patientId,
            systemTime: new Date(egv.systemTime),
            displayTime: new Date(egv.displayTime),
            value: egv.value,
            unit: egv.unit ?? "mg/dL",
            trend: mapDexcomTrend(egv.trend),
            trendRate: egv.trendRate ?? null,
          },
          update: {
            value: egv.value,
            trend: mapDexcomTrend(egv.trend),
            trendRate: egv.trendRate ?? null,
          },
        });
      }

      await prisma.syncDay.upsert({
        where: { patientId_date: { patientId: connection.patientId, date } },
        create: {
          patientId: connection.patientId,
          date,
          hasData: egvs.length > 0,
          readingCount: egvs.length,
        },
        update: {
          hasData: egvs.length > 0,
          readingCount: egvs.length,
          syncedAt: new Date(),
        },
      });

      await prisma.dexcomConnection.update({
        where: { id: connection.id },
        data: { lastSyncSuccessAt: new Date(), lastError: null },
      });

      succeeded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${connection.patientId}: ${message}`);

      await prisma.syncDay.upsert({
        where: { patientId_date: { patientId: connection.patientId, date } },
        create: { patientId: connection.patientId, date, hasData: false, readingCount: 0 },
        update: {},
      });

      await prisma.dexcomConnection.update({
        where: { id: connection.id },
        data: { lastError: message },
      });

      failed += 1;
    }
  }

  await prisma.syncRun.update({
    where: { id: syncRun.id },
    data: {
      finishedAt: new Date(),
      status: failed > 0 && succeeded === 0 ? "FAILED" : "COMPLETED",
      patientsProcessed: connections.length,
      patientsSucceeded: succeeded,
      patientsFailed: failed,
      errorSummary: errors.length > 0 ? errors.join("\n").slice(0, 4000) : null,
    },
  });

  return {
    syncRunId: syncRun.id,
    patientsProcessed: connections.length,
    patientsSucceeded: succeeded,
    patientsFailed: failed,
  };
}
