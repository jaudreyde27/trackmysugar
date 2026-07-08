import type { Medication } from "@prisma/client";

export function MedicationsList({ medications }: { medications: Medication[] }) {
  if (medications.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">No active medications on file.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-900 dark:border-neutral-800">
      {medications.map((med) => (
        <li key={med.id} className="flex flex-wrap items-baseline justify-between gap-x-4 px-4 py-3 text-sm">
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{med.name}</span>
          <span className="text-neutral-500 dark:text-neutral-400">
            {[med.dosage, med.frequency].filter(Boolean).join(" · ") || "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}
