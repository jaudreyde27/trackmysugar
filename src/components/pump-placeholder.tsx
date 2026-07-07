export function PumpPlaceholder() {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 px-4 text-center dark:border-neutral-700">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Pump data isn&apos;t integrated yet.
      </p>
      <p className="max-w-xs text-xs text-neutral-400 dark:text-neutral-500">
        Insulin delivery data (basal/bolus history, reservoir status) requires a
        separate integration with the patient&apos;s pump platform.
      </p>
    </div>
  );
}
