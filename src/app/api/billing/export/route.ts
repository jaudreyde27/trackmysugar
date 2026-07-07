import { NextRequest, NextResponse } from "next/server";
import { getOptionalSession } from "@/lib/auth/dal";
import { getBillingRosterForMonth } from "@/lib/data/billing";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session || !session.staffUser.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const year = Number(request.nextUrl.searchParams.get("year")) || now.getFullYear();
  const month = Number(request.nextUrl.searchParams.get("month")) || now.getMonth() + 1;

  const rows = await getBillingRosterForMonth(session.staffUser.organizationId, year, month);

  const header = [
    "Name",
    "MRN",
    "RPM Time (min)",
    "Days of Readings",
    "99453 Setup Date",
    "99454",
    "99457",
    "99458",
    "95251",
    "Status",
  ];

  const lines = [header.join(",")];
  for (const row of rows) {
    const e = row.eligibility;
    lines.push(
      [
        csvEscape(`${row.lastName}, ${row.firstName}`),
        row.mrn,
        e.monitoringMinutes.toFixed(1),
        String(e.daysOfReadings),
        e.code99453CompletedAt ? e.code99453CompletedAt.toISOString().slice(0, 10) : "",
        e.code99454 ? "Y" : "N",
        e.code99457 ? "Y" : "N",
        e.code99458 ? "Y" : "N",
        e.code95251 ? "Y" : "N",
        row.status,
      ].join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="rpm-billing-${year}-${String(month).padStart(2, "0")}.csv"`,
    },
  });
}
