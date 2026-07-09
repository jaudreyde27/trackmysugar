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
  PhoneType,
  InsuranceRank,
  SubscriberRelationship,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

type GlucoseProfile = {
  mean: number;
  stdDev: number;
  /** Of the last 30 days, how many have synced data (most recent first). */
  syncedDaysOutOf30: number;
};

type SeedMedication = { name: string; dosage: string; frequency: string };

type SeedContact = {
  email: string;
  phoneMobile?: string;
  phoneHome?: string;
  phoneWork?: string;
  preferredPhoneType: PhoneType;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
};

type SeedInsurance = {
  rank: InsuranceRank;
  payerName: string;
  memberId: string;
  groupNumber?: string;
  planType?: string;
  subscriberRelationship: SubscriberRelationship;
  subscriberName?: string;
};

type SeedDeviceHistory = {
  category: "CGM" | "PUMP";
  cgmDevice?: CgmDevice;
  insulinDeliveryDevice?: InsulinDeliveryDevice;
  startedAt: string;
  endedAt?: string;
};

type SeedPatient = {
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  enrolledAt: string;
  provider: string;
  type: DiabetesType;
  diagnosisCode: string;
  cgmDevice: CgmDevice | null;
  insulinDeliveryDevice: InsulinDeliveryDevice | null;
  profile: GlucoseProfile | null;
  medications: SeedMedication[];
  contact: SeedContact;
  insurance: SeedInsurance[];
  deviceHistory: SeedDeviceHistory[];
};

const PATIENTS: SeedPatient[] = [
  {
    mrn: "MRN-0001",
    firstName: "Ava",
    lastName: "Thompson",
    dob: "1988-03-14",
    enrolledAt: "2024-02-10",
    provider: "Dr. Sarah Chen",
    type: "TYPE_1",
    diagnosisCode: "E10.9",
    cgmDevice: "DEXCOM",
    insulinDeliveryDevice: "OMNIPOD",
    profile: { mean: 135, stdDev: 25, syncedDaysOutOf30: 30 },
    medications: [{ name: "Insulin Aspart", dosage: "Per pump settings", frequency: "Via Omnipod" }],
    contact: {
      email: "ava.thompson@example.com",
      phoneMobile: "(555) 201-4471",
      phoneHome: "(555) 201-9002",
      preferredPhoneType: "MOBILE",
      addressLine1: "412 Willowbrook Ln",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
    },
    insurance: [
      {
        rank: "PRIMARY",
        payerName: "Blue Cross Blue Shield",
        memberId: "BCB847213609",
        groupNumber: "GRP-55210",
        planType: "PPO",
        subscriberRelationship: "SELF",
      },
    ],
    deviceHistory: [
      { category: "CGM", cgmDevice: "DEXCOM", startedAt: "2024-02-10" },
      { category: "PUMP", insulinDeliveryDevice: "OMNIPOD", startedAt: "2024-02-10" },
    ],
  },
  {
    mrn: "MRN-0002",
    firstName: "Miguel",
    lastName: "Santos",
    dob: "1975-11-02",
    enrolledAt: "2023-08-22",
    provider: "Dr. Michael Torres",
    type: "TYPE_2",
    diagnosisCode: "E11.65",
    cgmDevice: "DEXCOM",
    insulinDeliveryDevice: "MDI",
    profile: { mean: 175, stdDev: 40, syncedDaysOutOf30: 24 },
    medications: [
      { name: "Insulin Glargine", dosage: "24 units", frequency: "Once daily at bedtime" },
      { name: "Metformin", dosage: "1000 mg", frequency: "Twice daily" },
      { name: "Atorvastatin", dosage: "20 mg", frequency: "Once daily" },
    ],
    contact: {
      email: "miguel.santos@example.com",
      phoneMobile: "(555) 340-8827",
      phoneWork: "(555) 340-1100",
      preferredPhoneType: "MOBILE",
      addressLine1: "88 Cedar Grove Ave",
      city: "Riverside",
      state: "CA",
      postalCode: "92501",
    },
    insurance: [
      {
        rank: "PRIMARY",
        payerName: "UnitedHealthcare",
        memberId: "UHC220984417",
        groupNumber: "GRP-90142",
        planType: "HMO",
        subscriberRelationship: "SELF",
      },
      {
        rank: "SECONDARY",
        payerName: "Medicare",
        memberId: "1EG4-TE5-MK72",
        planType: "Part B",
        subscriberRelationship: "SELF",
      },
    ],
    deviceHistory: [{ category: "CGM", cgmDevice: "DEXCOM", startedAt: "2023-08-22" }],
  },
  {
    mrn: "MRN-0003",
    firstName: "Priya",
    lastName: "Nair",
    dob: "2003-07-21",
    enrolledAt: "2025-05-01",
    provider: "Dr. Sarah Chen",
    type: "TYPE_1",
    diagnosisCode: "E10.65",
    cgmDevice: "FREESTYLE_LIBRE",
    insulinDeliveryDevice: "TANDEM",
    profile: { mean: 165, stdDev: 55, syncedDaysOutOf30: 10 },
    medications: [
      { name: "Insulin Lispro", dosage: "Per pump settings", frequency: "Via Tandem t:slim X2" },
      { name: "Levothyroxine", dosage: "50 mcg", frequency: "Once daily" },
    ],
    contact: {
      email: "priya.nair@example.com",
      phoneMobile: "(555) 118-3390",
      preferredPhoneType: "MOBILE",
      addressLine1: "27 Elmhurst Ct, Apt 4B",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
    },
    insurance: [
      {
        rank: "PRIMARY",
        payerName: "Aetna",
        memberId: "AET009834471",
        groupNumber: "GRP-30877",
        planType: "PPO",
        subscriberRelationship: "CHILD",
        subscriberName: "Anjali Nair",
      },
    ],
    deviceHistory: [
      { category: "CGM", cgmDevice: "DEXCOM", startedAt: "2025-05-01", endedAt: "2025-11-15" },
      { category: "CGM", cgmDevice: "FREESTYLE_LIBRE", startedAt: "2025-11-16" },
      { category: "PUMP", insulinDeliveryDevice: "TANDEM", startedAt: "2025-05-01" },
    ],
  },
  {
    mrn: "MRN-0004",
    firstName: "Daniel",
    lastName: "Okafor",
    dob: "1966-01-30",
    enrolledAt: "2026-06-15",
    provider: "Dr. Michael Torres",
    type: "TYPE_2",
    diagnosisCode: "E11.9",
    cgmDevice: "DEXCOM",
    insulinDeliveryDevice: "MDI",
    profile: null, // not connected yet — no history
    medications: [
      { name: "Metformin", dosage: "500 mg", frequency: "Twice daily" },
      { name: "Semaglutide", dosage: "1 mg", frequency: "Once weekly (injection)" },
      { name: "Lisinopril", dosage: "10 mg", frequency: "Once daily" },
    ],
    contact: {
      email: "daniel.okafor@example.com",
      phoneMobile: "(555) 402-7765",
      phoneHome: "(555) 402-1190",
      preferredPhoneType: "HOME",
      addressLine1: "1503 Maple Terrace",
      city: "Columbus",
      state: "OH",
      postalCode: "43215",
    },
    insurance: [
      {
        rank: "PRIMARY",
        payerName: "Cigna",
        memberId: "CIG774213098",
        groupNumber: "GRP-11934",
        planType: "HDHP",
        subscriberRelationship: "SELF",
      },
    ],
    deviceHistory: [{ category: "CGM", cgmDevice: "DEXCOM", startedAt: "2026-06-15" }],
  },
];

function gaussianStep(stdDev: number): number {
  // Box-Muller transform for a small increment (not an absolute value).
  const u1 = Math.random() || 1e-9;
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * stdDev;
}

// Gaussian-shaped bumps peaking ~60-90 min after breakfast/lunch/dinner and
// fading over ~4 hours — approximates the postprandial excursions a real CGM
// trace shows, rather than treating every tick as independent noise.
function mealBump(minuteOfDay: number): number {
  const meals = [7 * 60, 12 * 60, 18.5 * 60];
  let bump = 0;
  for (const start of meals) {
    const t = minuteOfDay - start;
    if (t >= 0 && t <= 240) {
      bump += 55 * Math.exp(-((t - 70) ** 2) / (2 * 45 ** 2));
    }
  }
  return bump;
}

async function seedGlucoseHistory(patientId: string, profile: GlucoseProfile) {
  const now = new Date();
  // Mean-reverting random walk (Ornstein-Uhlenbeck-ish), carried across the
  // whole history so consecutive readings actually look continuous — plain
  // independent-per-tick noise reads as static, nothing like a real Dexcom
  // trace. Walking oldest-to-newest keeps that continuity chronological.
  let current = profile.mean;

  for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
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
      const target = profile.mean + mealBump(minute);
      current += (target - current) * 0.15 + gaussianStep(profile.stdDev * 0.12);
      current = Math.min(400, Math.max(40, current));
      readings.push({
        systemTime: new Date(dayStart.getTime() + minute * 60 * 1000),
        value: Math.round(current),
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

// Fixed id so this matches the row the add_organization_model migration
// backfilled existing rows onto — upserting here just keeps the name in
// sync rather than creating a second org.
const DEFAULT_ORG_ID = "clinic_alpine_endocrine";

// Placeholder only — real medical-necessity/consent language is a legal
// template field pending compliance review (see Organization.rpmConsentTemplate).
const PLACEHOLDER_CONSENT_TEMPLATE =
  "[PLACEHOLDER — pending legal/compliance review] Patient has been informed of, and " +
  "consents to, remote physiologic monitoring services including the collection and " +
  "review of continuous glucose monitor data by clinical staff, with communication " +
  "occurring by phone and/or secure messaging as clinically appropriate.";

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: DEFAULT_ORG_ID },
    update: {
      name: "Alpine Endocrine Associates",
      rpmConsentTemplate: PLACEHOLDER_CONSENT_TEMPLATE,
      billingProviderName: "Alpine Endocrine Associates",
      billingProviderNpi: "1922334455",
      billingProviderTaxId: "84-1234567",
    },
    create: {
      id: DEFAULT_ORG_ID,
      name: "Alpine Endocrine Associates",
      rpmConsentTemplate: PLACEHOLDER_CONSENT_TEMPLATE,
      billingProviderName: "Alpine Endocrine Associates",
      billingProviderNpi: "1922334455",
      billingProviderTaxId: "84-1234567",
    },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const passwordHash = await hash(adminPassword, 12);

  const admin = await prisma.staffUser.upsert({
    where: { email: adminEmail },
    update: { portalType: "PRACTICE" },
    create: {
      email: adminEmail,
      passwordHash,
      name: "Practice Admin",
      role: "ADMIN",
      portalType: "PRACTICE",
      organizationId: org.id,
    },
  });
  console.log(`Staff user ready: ${admin.email} (password: ${adminPassword})`);

  // Platform-admin login — sits above any clinic (organizationId null),
  // sees the /admin area (org accounts, staff performance) that clinic
  // staff never do, regardless of their own role.
  const platformAdminEmail = process.env.SEED_PLATFORM_ADMIN_EMAIL ?? "platform-admin@example.com";
  const platformAdminPassword = process.env.SEED_PLATFORM_ADMIN_PASSWORD ?? "ChangeMe123!";
  const platformAdminPasswordHash = await hash(platformAdminPassword, 12);

  const platformAdmin = await prisma.staffUser.upsert({
    where: { email: platformAdminEmail },
    update: {},
    create: {
      email: platformAdminEmail,
      passwordHash: platformAdminPasswordHash,
      name: "Platform Admin",
      role: "ADMIN",
      isPlatformAdmin: true,
    },
  });
  console.log(
    `Platform admin ready: ${platformAdmin.email} (password: ${platformAdminPassword})`
  );

  // CDCES-portal login — the account with call/note/monitoring-logging
  // capability. Granted access to the seeded org via StaffOrganizationAccess
  // rather than the organizationId FK, so the practice switcher has
  // something real to read from once a second practice exists.
  const cdcesEmail = process.env.SEED_CDCES_EMAIL ?? "cdces@example.com";
  const cdcesPassword = process.env.SEED_CDCES_PASSWORD ?? "ChangeMe123!";
  const cdcesPasswordHash = await hash(cdcesPassword, 12);

  const cdces = await prisma.staffUser.upsert({
    where: { email: cdcesEmail },
    update: { portalType: "CDCES", credential: "CDCES" },
    create: {
      email: cdcesEmail,
      passwordHash: cdcesPasswordHash,
      name: "CDCES Clinician",
      role: "CLINICIAN",
      portalType: "CDCES",
      credential: "CDCES",
    },
  });
  await prisma.staffOrganizationAccess.upsert({
    where: { staffUserId_organizationId: { staffUserId: cdces.id, organizationId: org.id } },
    update: {},
    create: { staffUserId: cdces.id, organizationId: org.id },
  });
  console.log(`Staff user ready: ${cdces.email} (password: ${cdcesPassword})`);

  for (const p of PATIENTS) {
    const patient = await prisma.patient.upsert({
      where: { mrn: p.mrn },
      update: {
        primaryDiagnosisCode: p.diagnosisCode,
        primaryProviderName: p.provider,
        cgmDevice: p.cgmDevice,
        insulinDeliveryDevice: p.insulinDeliveryDevice,
        enrolledAt: new Date(p.enrolledAt),
        email: p.contact.email,
        phoneMobile: p.contact.phoneMobile,
        phoneHome: p.contact.phoneHome,
        phoneWork: p.contact.phoneWork,
        preferredPhoneType: p.contact.preferredPhoneType,
        addressLine1: p.contact.addressLine1,
        city: p.contact.city,
        state: p.contact.state,
        postalCode: p.contact.postalCode,
      },
      create: {
        mrn: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: new Date(p.dob),
        enrolledAt: new Date(p.enrolledAt),
        diabetesType: p.type,
        primaryDiagnosisCode: p.diagnosisCode,
        primaryProviderName: p.provider,
        cgmDevice: p.cgmDevice,
        insulinDeliveryDevice: p.insulinDeliveryDevice,
        organizationId: org.id,
        email: p.contact.email,
        phoneMobile: p.contact.phoneMobile,
        phoneHome: p.contact.phoneHome,
        phoneWork: p.contact.phoneWork,
        preferredPhoneType: p.contact.preferredPhoneType,
        addressLine1: p.contact.addressLine1,
        city: p.contact.city,
        state: p.contact.state,
        postalCode: p.contact.postalCode,
      },
    });

    if (p.profile) {
      await seedGlucoseHistory(patient.id, p.profile);

      // Reflect a real daily sync job having run successfully as of
      // yesterday (the most recent day seedGlucoseHistory always fills in
      // when syncedDaysOutOf30 >= 1) — otherwise "Last sync" on the CGM
      // panel would show nothing despite having a full glucose history.
      const now = new Date();
      const lastSync = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 6, 0, 0)
      );
      await prisma.dexcomConnection.upsert({
        where: { patientId: patient.id },
        update: {
          status: "ACTIVE",
          environment: "SANDBOX",
          lastSyncAttemptAt: lastSync,
          lastSyncSuccessAt: lastSync,
        },
        create: {
          patientId: patient.id,
          status: "ACTIVE",
          environment: "SANDBOX",
          connectedAt: new Date(p.enrolledAt),
          lastSyncAttemptAt: lastSync,
          lastSyncSuccessAt: lastSync,
        },
      });
    }

    const hasMedications = await prisma.medication.findFirst({ where: { patientId: patient.id } });
    if (!hasMedications) {
      await prisma.medication.createMany({
        data: p.medications.map((m) => ({
          patientId: patient.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
        })),
      });
    }

    const hasDeviceHistory = await prisma.deviceHistory.findFirst({ where: { patientId: patient.id } });
    if (!hasDeviceHistory) {
      await prisma.deviceHistory.createMany({
        data: p.deviceHistory.map((d) => ({
          patientId: patient.id,
          category: d.category,
          cgmDevice: d.cgmDevice ?? null,
          insulinDeliveryDevice: d.insulinDeliveryDevice ?? null,
          startedAt: new Date(d.startedAt),
          endedAt: d.endedAt ? new Date(d.endedAt) : null,
        })),
      });
    }

    for (const ins of p.insurance) {
      await prisma.insurancePolicy.upsert({
        where: { patientId_rank: { patientId: patient.id, rank: ins.rank } },
        update: {
          payerName: ins.payerName,
          memberId: ins.memberId,
          groupNumber: ins.groupNumber,
          planType: ins.planType,
          subscriberRelationship: ins.subscriberRelationship,
          subscriberName: ins.subscriberName,
        },
        create: {
          patientId: patient.id,
          rank: ins.rank,
          payerName: ins.payerName,
          memberId: ins.memberId,
          groupNumber: ins.groupNumber,
          planType: ins.planType,
          subscriberRelationship: ins.subscriberRelationship,
          subscriberName: ins.subscriberName,
        },
      });
    }
  }
  console.log(`Seeded ${PATIENTS.length} sample patients with synthetic glucose history.`);

  // A few completed CDCES touchpoints for the first patient — spanning
  // several months so the dashboard's "Last CDCES touchpoint" and the AI
  // notes synthesis both have a realistic multi-visit history to work with.
  const ava = await prisma.patient.findUnique({ where: { mrn: "MRN-0001" } });
  const existingCall = ava
    ? await prisma.monitoringSession.findFirst({ where: { patientId: ava.id, source: "CALL" } })
    : null;
  if (ava && !existingCall) {
    const daysAgoAt = (n: number, hour: number, minute: number) => {
      const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
      d.setHours(hour, minute, 0, 0);
      return d;
    };
    const avaCalls = [
      {
        startedAt: daysAgoAt(90, 10, 15),
        durationMin: 18,
        notes:
          "Discussed initial CGM sensor placement and reviewed onboarding materials. Patient reported adhesive irritation with the first sensor site and we discussed rotation strategy across the abdomen and upper arm. Also confirmed carb-counting basics given the recent Omnipod start, and scheduled a follow-up in six weeks.",
        talkingPoints: "- New to CGM and pump — confirm onboarding materials landed.\n- Time in range is 61%, below the 70% target.",
      },
      {
        startedAt: daysAgoAt(45, 14, 30),
        durationMin: 15,
        notes:
          "Followed up on sensor adhesion — patient switched sites and irritation resolved. Time in range has improved noticeably since the last call, particularly overnight. Reinforced bolus timing before meals to reduce the postprandial spikes she'd been seeing, and reviewed her food log together.",
        talkingPoints: "- Time in range improved to 71%.\n- Adhesive irritation resolved after site rotation change.",
      },
      {
        startedAt: daysAgoAt(5, 11, 44),
        durationMin: 12,
        notes:
          "Reviewed pump settings and reinforced carb counting; patient is doing well overall with no hypoglycemia episodes reported in the past two weeks. Discussed upcoming travel and adjusting basal rates for a time zone change. Scheduled a follow-up touchpoint in one month.",
        talkingPoints: "- Time in range is 78%, within target.\n- No recent hypoglycemia episodes.",
      },
    ];

    for (const call of avaCalls) {
      const endedAt = new Date(call.startedAt.getTime() + call.durationMin * 60 * 1000);
      await prisma.monitoringSession.create({
        data: {
          patientId: ava.id,
          staffUserId: admin.id,
          source: "CALL",
          startedAt: call.startedAt,
          occurredAt: call.startedAt,
          endedAt,
          durationSeconds: call.durationMin * 60,
          notes: call.notes,
          talkingPoints: call.talkingPoints,
        },
      });
    }
    console.log(`Seeded ${avaCalls.length} completed CDCES calls for Ava Thompson.`);
  }

  // Billing/audit fields + a couple of manual monitoring entries, so the
  // new Billing tab and summary card have realistic, non-empty data for at
  // least the demo-richest patients rather than every code showing unmet.
  const billingSeed: Record<
    string,
    {
      careManager: string;
      supervisingProvider: string;
      supervisingProviderNpi: string;
      consentDaysAgo: number;
      cpt99453DaysAgo: number | null;
      clinicalNotes: string;
      sex: string;
    }
  > = {
    "MRN-0001": {
      careManager: "Jordan Blake, RN",
      supervisingProvider: "Dr. Sarah Chen",
      supervisingProviderNpi: "1356792418",
      consentDaysAgo: 520,
      cpt99453DaysAgo: 515,
      clinicalNotes: "Stable on current pump settings; monitor for adhesive site irritation.",
      sex: "Female",
    },
    "MRN-0002": {
      careManager: "Jordan Blake, RN",
      supervisingProvider: "Dr. Michael Torres",
      supervisingProviderNpi: "1487293651",
      consentDaysAgo: 680,
      cpt99453DaysAgo: 675,
      clinicalNotes: "Dual insurance (Medicare secondary) — verify coverage before claim submission.",
      sex: "Male",
    },
    "MRN-0003": {
      careManager: "Priya Desai, CDCES",
      supervisingProvider: "Dr. Sarah Chen",
      supervisingProviderNpi: "1356792418",
      consentDaysAgo: 60,
      cpt99453DaysAgo: 58,
      clinicalNotes: "Recently transitioned to Tandem pump; sensor adherence has been inconsistent.",
      sex: "Female",
    },
    "MRN-0004": {
      careManager: "Priya Desai, CDCES",
      supervisingProvider: "Dr. Michael Torres",
      supervisingProviderNpi: "1487293651",
      consentDaysAgo: 20,
      cpt99453DaysAgo: null,
      clinicalNotes: "New enrollment — 99453 setup/education visit not yet completed.",
      sex: "Male",
    },
  };

  for (const [mrn, b] of Object.entries(billingSeed)) {
    const patient = await prisma.patient.findUnique({ where: { mrn } });
    if (!patient) continue;
    await prisma.patient.update({
      where: { id: patient.id },
      data: {
        careManagerName: b.careManager,
        supervisingProviderName: b.supervisingProvider,
        supervisingProviderNpi: b.supervisingProviderNpi,
        clinicalNotes: b.clinicalNotes,
        sex: b.sex,
        consentDate: new Date(Date.now() - b.consentDaysAgo * 24 * 60 * 60 * 1000),
        cpt99453CompletedAt:
          b.cpt99453DaysAgo != null ? new Date(Date.now() - b.cpt99453DaysAgo * 24 * 60 * 60 * 1000) : null,
      },
    });
  }

  // A couple of this-month manual/NOTE monitoring entries with interactive
  // communication, so 99457/99458/95251 have something to actually compute
  // against on the Billing tab rather than every code showing unmet.
  if (ava) {
    const existingManual = await prisma.monitoringSession.findFirst({
      where: { patientId: ava.id, source: "MANUAL" },
    });
    if (!existingManual) {
      const now = new Date();
      const thisMonth = (day: number, hour: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour));
      await prisma.monitoringSession.createMany({
        data: [
          {
            patientId: ava.id,
            staffUserId: admin.id,
            source: "MANUAL",
            occurredAt: thisMonth(3, 15),
            durationSeconds: 14 * 60,
            twoWayCommunication: true,
            notes: "Reviewed time-in-range trend with patient by phone; no changes needed.",
          },
          {
            patientId: ava.id,
            staffUserId: admin.id,
            source: "NOTE",
            occurredAt: thisMonth(10, 9),
            durationSeconds: 8 * 60,
            twoWayCommunication: true,
            templateUsed: "Chart Comment",
            notes: "Reviewed CGM data and chart for this reporting period. No concerning patterns identified.",
          },
        ],
      });
      console.log("Seeded this-month monitoring entries for Ava Thompson (billing demo data).");
    }
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
