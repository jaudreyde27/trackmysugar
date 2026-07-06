// Dev/demo bootstrap only. Creates one admin login and a handful of fake
// patients (no real PHI) so the dashboard has something to show locally.
// Run with: npm run db:seed
import "dotenv/config";
import { PrismaClient, DiabetesType } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

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

  const patients: Array<{ mrn: string; firstName: string; lastName: string; dob: string; type: DiabetesType }> = [
    { mrn: "MRN-0001", firstName: "Ava", lastName: "Thompson", dob: "1988-03-14", type: "TYPE_1" },
    { mrn: "MRN-0002", firstName: "Miguel", lastName: "Santos", dob: "1975-11-02", type: "TYPE_2" },
    { mrn: "MRN-0003", firstName: "Priya", lastName: "Nair", dob: "2003-07-21", type: "TYPE_1" },
    { mrn: "MRN-0004", firstName: "Daniel", lastName: "Okafor", dob: "1966-01-30", type: "TYPE_2" },
  ];

  for (const p of patients) {
    await prisma.patient.upsert({
      where: { mrn: p.mrn },
      update: {},
      create: {
        mrn: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: new Date(p.dob),
        diabetesType: p.type,
      },
    });
  }
  console.log(`Seeded ${patients.length} sample patients.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
