"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { RPM_CPT_CODES, upsertReimbursementRate } from "@/lib/data/reimbursement-rates";
import { logAudit } from "@/lib/audit";

export async function saveReimbursementRates(formData: FormData) {
  const session = await requireAdmin();
  if (!session.staffUser.organizationId) throw new Error("No organization selected");

  for (const code of RPM_CPT_CODES) {
    const raw = formData.get(`rate_${code}`);
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) continue;
    await upsertReimbursementRate(session.staffUser.organizationId, code, value);
  }

  await logAudit({ staffUserId: session.staffUser.id, action: "REIMBURSEMENT_RATES_UPDATED" });

  revalidatePath("/settings/reimbursement-rates");
  revalidatePath("/billing");
}
