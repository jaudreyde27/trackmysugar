"use client";

import { useState } from "react";

export type TouchpointRow = {
  id: string;
  startedAt: string;
  endedAt: string | null;
};

const VISIBLE_COUNT = 3;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(startIso: string, endIso: string): string {
  const minutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  return `${minutes} min`;
}

export function CdcesTouchpointsList({ touchpoints }: { touchpoints: TouchpointRow[] }) {
  const [showAll, setShowAll] = useState(false);

  if (touchpoints.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">No CDCES touchpoints logged yet.</p>;
  }

  const sorted = [...touchpoints].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
  const visible = showAll ? sorted : sorted.slice(0, VISIBLE_COUNT);

  return (
    <div>
      <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-900 dark:border-neutral-800">
        {visible.map((t) => (
          <li key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-neutral-700 dark:text-neutral-300">{formatDateTime(t.startedAt)}</span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {t.endedAt ? formatDuration(t.startedAt, t.endedAt) : "in progress"}
            </span>
          </li>
        ))}
      </ul>
      {sorted.length > VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-xs font-medium text-neutral-600 hover:underline dark:text-neutral-400"
        >
          {showAll ? "Show less" : `View full history (${sorted.length})`}
        </button>
      )}
    </div>
  );
}
