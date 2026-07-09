"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { generateMonthlyBatch as generateMonthlyBatchForOrg } from "@/lib/data/rpm-billing-batch";

export async function generateMonthlyBatch(year: number, month: number) {
  const session = await verifySession();
  if (!session.staffUser.organizationId) throw new Error("No organization selected");

  await generateMonthlyBatchForOrg(session.staffUser.organizationId, year, month, session.staffUser.id);

  revalidatePath("/billing");
}
