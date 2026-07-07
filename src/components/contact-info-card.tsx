import type { ContactInfo } from "@/lib/data/patient-detail";
import type { PhoneType } from "@/generated/prisma/client";

const PHONE_LABELS: Record<PhoneType, string> = {
  MOBILE: "Mobile",
  HOME: "Home",
  WORK: "Work",
};

function PhoneRow({
  type,
  number,
  preferred,
}: {
  type: PhoneType;
  number: string;
  preferred: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-xs text-neutral-500 dark:text-neutral-400">
        {PHONE_LABELS[type]}
      </span>
      <span
        className={
          preferred
            ? "font-semibold text-neutral-900 dark:text-neutral-100"
            : "text-neutral-700 dark:text-neutral-300"
        }
      >
        {number}
      </span>
      {preferred && (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: "var(--status-good)" }}
        >
          Preferred
        </span>
      )}
    </div>
  );
}

export function ContactInfoCard({ contact }: { contact: ContactInfo }) {
  const phones = (
    [
      { type: "MOBILE", number: contact.phoneMobile },
      { type: "HOME", number: contact.phoneHome },
      { type: "WORK", number: contact.phoneWork },
    ] as Array<{ type: PhoneType; number: string | null }>
  ).filter((p): p is { type: PhoneType; number: string } => Boolean(p.number));

  const addressParts = [
    contact.addressLine1,
    contact.addressLine2,
    [contact.city, contact.state].filter(Boolean).join(", "),
    contact.postalCode,
  ].filter(Boolean);

  const hasAnything = phones.length > 0 || contact.email || addressParts.length > 0;

  if (!hasAnything) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">No contact information on file.</p>;
  }

  return (
    <div className="space-y-3 text-sm">
      {phones.length > 0 && (
        <div className="space-y-1.5">
          {phones.map((p) => (
            <PhoneRow
              key={p.type}
              type={p.type}
              number={p.number}
              preferred={contact.preferredPhoneType === p.type}
            />
          ))}
        </div>
      )}
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
  );
}
