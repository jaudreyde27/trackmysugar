"use client";

import { useState } from "react";
import { DisclosureToggle } from "@/components/disclosure-toggle";
import type { ContactInfo } from "@/lib/data/patient-detail";
import type { PhoneType, InsuranceRank, SubscriberRelationship } from "@/generated/prisma/client";

const PHONE_LABELS: Record<PhoneType, string> = {
  MOBILE: "Mobile",
  HOME: "Home",
  WORK: "Work",
};

const RANK_LABELS: Record<InsuranceRank, string> = { PRIMARY: "Primary", SECONDARY: "Secondary" };
const RELATIONSHIP_LABELS: Record<SubscriberRelationship, string> = {
  SELF: "Self",
  SPOUSE: "Spouse",
  CHILD: "Child",
  OTHER: "Other",
};

export type InsuranceRow = {
  id: string;
  rank: InsuranceRank;
  payerName: string;
  memberId: string;
  groupNumber: string | null;
  planType: string | null;
  subscriberRelationship: SubscriberRelationship;
  subscriberName: string | null;
};

function PolicyRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-right text-neutral-800 dark:text-neutral-200">{value}</span>
    </div>
  );
}

export function ContactAndInsuranceCard({
  contact,
  insurance,
}: {
  contact: ContactInfo;
  insurance: InsuranceRow[];
}) {
  const [expanded, setExpanded] = useState(false);

  const allPhones = (
    [
      { type: "MOBILE", number: contact.phoneMobile },
      { type: "HOME", number: contact.phoneHome },
      { type: "WORK", number: contact.phoneWork },
    ] as Array<{ type: PhoneType; number: string | null }>
  ).filter((p): p is { type: PhoneType; number: string } => Boolean(p.number));

  const preferred =
    allPhones.find((p) => p.type === contact.preferredPhoneType) ?? allPhones[0] ?? null;
  const otherPhones = allPhones.filter((p) => p !== preferred);

  const addressParts = [
    contact.addressLine1,
    contact.addressLine2,
    [contact.city, contact.state].filter(Boolean).join(", "),
    contact.postalCode,
  ].filter(Boolean);

  const hasMoreDetails = otherPhones.length > 0 || contact.email || addressParts.length > 0 || insurance.length > 0;

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      {preferred ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="w-14 text-xs text-neutral-500 dark:text-neutral-400">
            {PHONE_LABELS[preferred.type]}
          </span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">{preferred.number}</span>
          {contact.preferredPhoneType === preferred.type && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: "var(--status-good)" }}
            >
              Preferred
            </span>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No phone number on file.</p>
      )}

      {hasMoreDetails && (
        <div className="mt-2">
          <DisclosureToggle
            expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            labelExpanded="Hide contact & insurance details"
            labelCollapsed="Show contact & insurance details"
          />

          {expanded && (
            <div className="mt-3 space-y-4 border-t border-neutral-200 pt-3 text-sm dark:border-neutral-800">
              {(otherPhones.length > 0 || contact.email || addressParts.length > 0) && (
                <div className="space-y-1.5">
                  {otherPhones.map((p) => (
                    <div key={p.type} className="flex items-center gap-2">
                      <span className="w-14 text-xs text-neutral-500 dark:text-neutral-400">
                        {PHONE_LABELS[p.type]}
                      </span>
                      <span className="text-neutral-700 dark:text-neutral-300">{p.number}</span>
                    </div>
                  ))}
                  {contact.email && (
                    <div className="text-neutral-700 dark:text-neutral-300">{contact.email}</div>
                  )}
                  {addressParts.length > 0 && (
                    <div className="text-neutral-700 dark:text-neutral-300">
                      {addressParts.map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {insurance.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Insurance
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {insurance.map((policy) => (
                      <div
                        key={policy.id}
                        className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
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
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
