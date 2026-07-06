// Dev/demo bootstrap only. Creates one admin login and a handful of fake
// patients (no real PHI) with synthetic glucose history so the dashboard has
// something to show locally, without needing a live Dexcom connection.
// Run with: npm run db:seed
import "dotenv/config";
import {
  PrismaClient,
  DiabetesType,
  CgmDevice,
  InsulinDeliveryDevice,
  EgvTrend,
} from "../src/generated/prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

type GlucoseProfile = {
  mean: number;
  stdDev: number;
  /** Of the last 30 days, how many have synced data (most recent first). */
  syncedDaysOutOf30: number;
};

type SeedPatient = {
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  type: DiabetesType;
  diagnosisCode: string;
  cgmDevice: CgmDevice | null;
  insulinDeliveryDevice: InsulinDeliveryDevice | null;
  profile: GlucoseProfile | null;
};

const PATIENTS: SeedPatient[] = [
  {
    mrn: "MRN-0001",
    firstName: "Ava",
    lastName: "Thompson",
    dob: "1988-03-14",
    type: "TYPE_1",
    diagnosisCode: "E10.9",
    cgmDevice: "DEXCOM",
    insulinDeliveryDevice: "OMNIPOD",
    profile: { mean: 135, stdDev: 25, syncedDaysOutOf30: 30 },
  },
  {
    mrn: "MRN-0002",
    firstName: "Miguel",
    lastName: "Santos",
    dob: "1975-11-02",
    type: "TYPE_2",
    diagnosisCode: "E11.65",
    cgmDevice: "DEXCOM",
    insulinDeliveryDevice: "MDI",
    profile: { mean: 175, stdDev: 40, syncedDaysOutOf30: 24 },
  },
  {
    mrn: "MRN-0003",
    firstName: "Priya",
    lastName: "Nair",
    dob: "2003-07-21",
    type: "TYPE_1",
    diagnosisCode: "E10.65",
    cgmDevice: "FREESTYLE_LIBRE",
    insulinDeliveryDevice: "TANDEM",
    profile: { mean: 165, stdDev: 55, syncedDaysOutOf30: 10 },
  },
  {
    mrn: "MRN-0004",
    firstName: "Daniel",
    lastName: "Okafor",
    dob: "1966-01-30",
    type: "TYPE_2",
    diagnosisCode: "E11.9",
    cgmDevice: "DEXCOM",
    insulinDeliveryDevice: "MDI",
    profile: null, // not connected yet — no history
  },
];

function randomNormal(mean: number, stdDev: number): number {
  // Box-Muller transform, clamped to a plausible mg/dL range.
  const u1 = Math.random() || 1e-9;
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.round(Math.min(400, Math.max(40, mean + z * stdDev)));
}

async function seedGlucoseHistory(patientId: string, profile: GlucoseProfile) {
  const now = new Date();

  for (let dayOffset = 1; dayOffset <= 30; dayOffset++) {
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOffset)
    );
    const synced = dayOffset <= profile.syncedDaysOutOf30;

    if (!synced) {
      await prisma.syncDay.upsert({
        where: { patientId_date: { patientId, date: dayStart } },
        update: {},
        create: { patientId, date: dayStart, hasData: false, readingCount: 0 },
      });
      continue;
    }

    // One reading every 15 minutes for the day (lighter than real 5-minute
    // Dexcom cadence, plenty for demo stats/charts).
    const readings: { systemTime: Date; value: number }[] = [];
    for (let minute = 0; minute < 24 * 60; minute += 15) {
      readings.push({
        systemTime: new Date(dayStart.getTime() + minute * 60 * 1000),
        value: randomNormal(profile.mean, profile.stdDev),
      });
    }

    await prisma.glucoseReading.createMany({
      data: readings.map((r) => ({
        patientId,
        systemTime: r.systemTime,
        displayTime: r.systemTime,
        value: r.value,
        unit: "mg/dL",
        trend: EgvTrend.FLAT,
      })),
      skipDuplicates: true,
    });

    await prisma.syncDay.upsert({
      where: { patientId_date: { patientId, date: dayStart } },
      update: { hasData: true, readingCount: readings.length },
      create: { patientId, date: dayStart, hasData: true, readingCount: readings.length },
    });
  }
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const passwordHash = await hash(adminPassword, 12);

  const admin = await prisma.staffUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: "Practice Admin",
      role: "ADMIN",
    },
  });
  console.log(`Staff user ready: ${admin.email} (password: ${adminPassword})`);

  for (const p of PATIENTS) {
    const patient = await prisma.patient.upsert({
      where: { mrn: p.mrn },
      update: {
        primaryDiagnosisCode: p.diagnosisCode,
        cgmDevice: p.cgmDevice,
        insulinDeliveryDevice: p.insulinDeliveryDevice,
      },
      create: {
        mrn: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: new Date(p.dob),
        diabetesType: p.type,
        primaryDiagnosisCode: p.diagnosisCode,
        cgmDevice: p.cgmDevice,
        insulinDeliveryDevice: p.insulinDeliveryDevice,
      },
    });

    if (p.profile) {
      await seedGlucoseHistory(patient.id, p.profile);
    }
  }
  console.log(`Seeded ${PATIENTS.length} sample patients with synthetic glucose history.`);

  // One completed CDCES touchpoint for the first patient, so the dashboard
  // has a non-empty "Last CDCES touchpoint" to show.
  const ava = await prisma.patient.findUnique({ where: { mrn: "MRN-0001" } });
  const existingCall = ava
    ? await prisma.cdcesCallSession.findFirst({ where: { patientId: ava.id } })
    : null;
  if (ava && !existingCall) {
    const startedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    await prisma.cdcesCallSession.create({
      data: {
        patientId: ava.id,
        staffUserId: admin.id,
        startedAt,
        endedAt: new Date(startedAt.getTime() + 12 * 60 * 1000),
        notes: "Reviewed pump settings and reinforced carb counting. Patient doing well overall.",
        talkingPoints: "- Time in range is 78%, within target.\n- No recent hypoglycemia episodes.",
      },
    });
    console.log("Seeded one completed CDCES call for Ava Thompson.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
