import { NextRequest, NextResponse } from "next/server";
import { getOptionalSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { getBillingBatchForPeriod } from "@/lib/data/rpm-billing-batch";

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

  const batchSummary = await getBillingBatchForPeriod(organizationId, year, month);
  if (!batchSummary) {
    return NextResponse.json(
      { error: "No RPM billing batch has been generated for this period yet" },
      { status: 404 }
    );
  }

  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 1));

  const [lines, exclusions] = await Promise.all([
    prisma.rpmBillingLine.findMany({
      where: { batchId: batchSummary.id },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            sex: true,
            insurancePolicies: { where: { rank: "PRIMARY" }, select: { memberId: true } },
          },
        },
      },
      orderBy: [{ patient: { lastName: "asc" } }, { patient: { firstName: "asc" } }, { cptCode: "asc" }],
    }),
    prisma.rpmExclusion.findMany({
      where: { organizationId, periodStart, periodEnd },
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: [{ patient: { lastName: "asc" } }, { patient: { firstName: "asc" } }],
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
  for (const line of lines) {
    rows.push(
      [
        csvEscape(line.patient.lastName),
        csvEscape(line.patient.firstName),
        dateOnly(line.patient.dateOfBirth),
        line.patient.sex ?? "",
        csvEscape(line.patient.insurancePolicies[0]?.memberId ?? ""),
        line.diagnosisCode,
        dateOnly(line.billingPeriodStart),
        dateOnly(line.billingPeriodEnd),
        line.placeOfService,
        line.cptCode,
        line.modifier ?? "",
        line.diagnosisPointer,
        "",
        String(line.units),
        line.renderingProviderNpi ?? "",
        csvEscape(line.billingProviderName ?? ""),
        line.billingProviderNpi ?? "",
        line.billingProviderTaxId ?? "",
      ].join(",")
    );
  }

  rows.push("");
  rows.push("Excluded Patients");
  for (const exclusion of exclusions) {
    rows.push(
      [csvEscape(`${exclusion.patient.lastName}, ${exclusion.patient.firstName}`), csvEscape(exclusion.reason)].join(
        ","
      )
    );
  }

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="rpm-billing-batch-${year}-${String(month).padStart(2, "0")}.csv"`,
    },
  });
}
