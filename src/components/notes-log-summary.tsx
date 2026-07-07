"use client";

import { useState } from "react";
import { DisclosureToggle } from "@/components/disclosure-toggle";

export type NotecardRow = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  notes: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function NotesLogSummary({ summary, sessions }: { summary: string; sessions: NotecardRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const notecards = sessions.filter((s) => s.notes.trim().length > 0);

  return (
    <div>
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/50">
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          AI summary across visits
        </div>
        <p className="mt-1 text-neutral-700 dark:text-neutral-300">{summary}</p>
      </div>

      {notecards.length > 0 && (
        <div className="mt-3">
          <DisclosureToggle
            expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            labelExpanded="Hide visit notes"
            labelCollapsed={`Show all visit notes (${notecards.length})`}
          />

          {expanded && (
            <ul className="mt-2 space-y-3">
              {notecards.map((session) => (
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
          )}
        </div>
      )}
    </div>
  );
}
