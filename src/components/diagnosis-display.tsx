import { getDiagnosisName } from "@/lib/diagnosis-codes";

export function DiagnosisDisplay({ code }: { code: string }) {
  const name = getDiagnosisName(code);
  return (
    <div>
      <div className="font-mono text-xs text-neutral-700 dark:text-neutral-300">{code}</div>
      {name && (
        <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{name}</div>
      )}
    </div>
  );
}
