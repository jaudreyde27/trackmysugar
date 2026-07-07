const TONE_CLASSES = {
  compliant: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  non_compliant: "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400",
} as const;

export type PillTone = keyof typeof TONE_CLASSES;

// Shared status-pill design token — compliance history, billing status,
// and anywhere else a tone-coded status label is needed.
export function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}
