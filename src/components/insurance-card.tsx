import type { InsurancePolicy } from "@/generated/prisma/client";

const RANK_LABELS = { PRIMARY: "Primary", SECONDARY: "Secondary" } as const;
const RELATIONSHIP_LABELS = {
  SELF: "Self",
  SPOUSE: "Spouse",
  CHILD: "Child",
  OTHER: "Other",
} as const;

function PolicyRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-right text-neutral-800 dark:text-neutral-200">{value}</span>
    </div>
  );
}

export function InsuranceCard({ policies }: { policies: InsurancePolicy[] }) {
  if (policies.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">No insurance on file.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {policies.map((policy) => (
        <div
          key={policy.id}
          className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {policy.payerName}
            </span>
            <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {RANK_LABELS[policy.rank]}
            </span>
          </div>
          <div className="space-y-1">
            <PolicyRow label="Member ID" value={policy.memberId} />
            <PolicyRow label="Group #" value={policy.groupNumber} />
            <PolicyRow label="Plan type" value={policy.planType} />
            <PolicyRow
              label="Subscriber"
              value={
                policy.subscriberRelationship === "SELF"
                  ? "Self"
                  : `${policy.subscriberName ?? "—"} (${RELATIONSHIP_LABELS[policy.subscriberRelationship]})`
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
