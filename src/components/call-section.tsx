import { CallTimer } from "@/components/call-timer";
import { CallNotesEditor } from "@/components/call-notes-editor";
import { startCdcesCall, endCdcesCall } from "@/app/actions/cdces";

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CallSection({
  patientId,
  activeCallSession,
}: {
  patientId: string;
  activeCallSession: { id: string; startedAt: Date | null; notes: string; talkingPoints: string | null } | null;
}) {
  const boundStartCall = startCdcesCall.bind(null, patientId);

  if (!activeCallSession) {
    return (
      <form action={boundStartCall}>
        <button
          type="submit"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Start RPM Call
        </button>
      </form>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Call in progress</div>
          {activeCallSession.startedAt && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Started {formatDateTime(activeCallSession.startedAt)}
            </div>
          )}
        </div>
        {activeCallSession.startedAt && <CallTimer startedAt={activeCallSession.startedAt.toISOString()} />}
      </div>

      <div className="mt-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Key talking points
        </h3>
        <div className="mt-1 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-300">
          <ul className="list-inside list-disc space-y-1">
            {(activeCallSession.talkingPoints ?? "")
              .split("\n")
              .map((line) => line.replace(/^[-*]\s*/, "").trim())
              .filter(Boolean)
              .map((line, i) => (
                <li key={i}>{line}</li>
              ))}
          </ul>
        </div>
      </div>

      <div className="mt-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Call notes
        </h3>
        <div className="mt-1">
          <CallNotesEditor sessionId={activeCallSession.id} initialNotes={activeCallSession.notes} />
        </div>
      </div>

      <form action={endCdcesCall.bind(null, activeCallSession.id, patientId)} className="mt-3">
        <button
          type="submit"
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          End call
        </button>
      </form>
    </div>
  );
}
