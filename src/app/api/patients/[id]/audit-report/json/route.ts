import { randomUUID, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getOptionalSession } from "@/lib/auth/dal";
import { getAuditReportData } from "@/lib/data/audit-report";
import { logAudit } from "@/lib/audit";

// Same underlying data as the PDF export, as JSON — for re-generation
// (e.g. rendering the PDF template elsewhere) or feeding other tooling.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getOptionalSession();
  if (!session || !session.staffUser.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const now = new Date();
  const year = Number(request.nextUrl.searchParams.get("year")) || now.getFullYear();
  const month = Number(request.nextUrl.searchParams.get("month")) || now.getMonth() + 1;

  const data = await getAuditReportData(id, session.staffUser.organizationId, year, month);
  if (!data) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const reportId = randomUUID();
  const generatedAt = new Date();
  const contentHash = createHash("sha256").update(JSON.stringify(data)).digest("hex");

  await logAudit({
    staffUserId: session.staffUser.id,
    patientId: id,
    action: "AUDIT_REPORT_JSON_EXPORTED",
    metadata: { year, month, reportId, contentHash },
  });

  return NextResponse.json({
    metadata: { reportId, generatedAt, generatedByName: session.staffUser.name, contentHash },
    data,
  });
}
