import type { CdcesCallSession } from "@/generated/prisma/client";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function NotesLogSummary({ sessions }: { sessions: CdcesCallSession[] }) {
  const withNotes = sessions.filter((s) => s.notes.trim().length > 0);

  if (withNotes.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">No notes logged yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {withNotes.map((session) => (
        <li
          key={session.id}
          className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800"
        >
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {formatDate(session.startedAt)}
            {!session.endedAt && " · in progress"}
          </div>
          <p className="mt-1 text-neutral-700 dark:text-neutral-300">{session.notes}</p>
        </li>
      ))}
    </ul>
  );
}
