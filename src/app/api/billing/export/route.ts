import { NextRequest, NextResponse } from "next/server";
import { getOptionalSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { getCptEligibilityForMonth } from "@/lib/data/billing";

// Mirrors the thresholds in src/lib/data/billing.ts — duplicated locally
// (same convention used by src/lib/data/rpm-billing-batch.ts) since this
// route only needs them for the excluded-patient shortfall message.
const CPT_99454_MIN_DAYS = 16;
const CPT_99457_MIN_MINUTES = 20;

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session || !session.staffUser.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const organizationId = session.staffUser.organizationId;

  const now = new Date();
  const year = Number(request.nextUrl.searchParams.get("year")) || now.getFullYear();
  const month = Number(request.nextUrl.searchParams.get("month")) || now.getMonth() + 1;
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 1));

  const [organization, patients] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { billingProviderName: true, billingProviderNpi: true, billingProviderTaxId: true },
    }),
    prisma.patient.findMany({
      where: { organizationId, active: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        sex: true,
        primaryDiagnosisCode: true,
        supervisingProviderNpi: true,
        cpt99453CompletedAt: true,
        insurancePolicies: { where: { rank: "PRIMARY" }, select: { memberId: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const header = [
    "Patient Last Name",
    "Patient First Name",
    "Patient DOB",
    "Patient Sex",
    "Insurance Subscriber ID",
    "Diagnosis Code (ICD-10)",
    "Date of Service - From",
    "Date of Service - To",
    "Place of Service",
    "CPT/HCPCS Code",
    "Modifier",
    "Diagnosis Pointer",
    "Charges",
    "Units",
    "Rendering Provider NPI",
    "Billing Provider Name",
    "Billing Provider NPI",
    "Billing Provider Tax ID",
  ];

  const rows = [header.join(",")];
  const excludedRows: string[] = [];

  for (const patient of patients) {
    const eligibility = await getCptEligibilityForMonth(patient, year, month);

    const candidates: Array<{ cptCode: string; units: number }> = [];
    if (eligibility.code99453) candidates.push({ cptCode: "99453", units: 1 });
    if (eligibility.code99454) candidates.push({ cptCode: "99454", units: 1 });
    if (eligibility.code99457) candidates.push({ cptCode: "99457", units: 1 });
    if (eligibility.code99458) {
      candidates.push({ cptCode: "99458", units: Math.floor((eligibility.interactiveMinutes - 20) / 20) });
    }

    if (candidates.length === 0) {
      const shortfalls: string[] = [];
      if (eligibility.daysOfReadings < CPT_99454_MIN_DAYS) {
        shortfalls.push(`Transmission days: ${eligibility.daysOfReadings}/${CPT_99454_MIN_DAYS} required`);
      }
      if (eligibility.interactiveMinutes < CPT_99457_MIN_MINUTES) {
        shortfalls.push(
          `Interactive time: ${eligibility.interactiveMinutes.toFixed(0)}/${CPT_99457_MIN_MINUTES} min required`
        );
      }
      excludedRows.push(
        [
          csvEscape(`${patient.lastName}, ${patient.firstName}`),
          csvEscape(shortfalls.length > 0 ? shortfalls.join("; ") : "No qualifying RPM activity this period"),
        ].join(",")
      );
      continue;
    }

    for (const candidate of candidates) {
      rows.push(
        [
          csvEscape(patient.lastName),
          csvEscape(patient.firstName),
          dateOnly(patient.dateOfBirth),
          patient.sex ?? "",
          csvEscape(patient.insurancePolicies[0]?.memberId ?? ""),
          patient.primaryDiagnosisCode,
          dateOnly(periodStart),
          dateOnly(periodEnd),
          "11",
          candidate.cptCode,
          "",
          "A",
          "",
          String(candidate.units),
          patient.supervisingProviderNpi ?? "",
          csvEscape(organization.billingProviderName ?? ""),
          organization.billingProviderNpi ?? "",
          organization.billingProviderTaxId ?? "",
        ].join(",")
      );
    }
  }

  rows.push("");
  rows.push("Excluded Patients");
  rows.push(...excludedRows);

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="rpm-billing-${year}-${String(month).padStart(2, "0")}.csv"`,
    },
  });
}
