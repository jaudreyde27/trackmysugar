import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getOptionalSession } from "@/lib/auth/dal";
import { getBillingRosterForMonth } from "@/lib/data/billing";
import { BillingSummaryDocument } from "@/lib/pdf/billing-summary-document";

export async function GET(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session || !session.staffUser.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const year = Number(request.nextUrl.searchParams.get("year")) || now.getFullYear();
  const month = Number(request.nextUrl.searchParams.get("month")) || now.getMonth() + 1;

  const rows = await getBillingRosterForMonth(session.staffUser.organizationId, year, month);
  const buffer = await renderToBuffer(
    BillingSummaryDocument({ organizationName: session.staffUser.organizationName ?? "", rows, year, month })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rpm-billing-${year}-${String(month).padStart(2, "0")}.pdf"`,
    },
  });
}
