import { randomUUID, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getOptionalSession } from "@/lib/auth/dal";
import { getAuditReportData } from "@/lib/data/audit-report";
import { AuditReportDocument } from "@/lib/pdf/audit-report-document";
import { logAudit } from "@/lib/audit";

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
  const metadata = { reportId, generatedAt, generatedByName: session.staffUser.name, contentHash };

  const buffer = await renderToBuffer(AuditReportDocument({ data, metadata }));

  await logAudit({
    staffUserId: session.staffUser.id,
    patientId: id,
    action: "AUDIT_REPORT_DOWNLOADED",
    metadata: { year, month, reportId, contentHash },
  });

  const fileSafeName = `${data.patient.firstName}-${data.patient.lastName}`.replace(/[^a-zA-Z0-9-]+/g, "");
  const dob = new Date(data.patient.dateOfBirth).toISOString().slice(0, 10);
  const filename = `rpm-audit-report-${fileSafeName}-${dob}-${year}-${String(month).padStart(2, "0")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
