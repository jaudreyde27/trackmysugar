// Standalone entry point for the daily Dexcom sync, runnable from any
// scheduler (cron, systemd timer, GitHub Actions, etc.) via `npm run sync:daily`.
import "dotenv/config";
import { runDailySync } from "../src/lib/sync/run";
import { prisma } from "../src/lib/db";

async function main() {
  const summary = await runDailySync();
  console.log(
    `Daily sync complete: ${summary.patientsSucceeded}/${summary.patientsProcessed} patients synced (${summary.patientsFailed} failed). Run ID: ${summary.syncRunId}`
  );
}

main()
  .catch((err) => {
    console.error("Daily sync failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
