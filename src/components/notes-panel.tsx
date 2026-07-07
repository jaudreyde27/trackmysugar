"use client";

import { useMemo, useState } from "react";
import { DisclosureToggle } from "@/components/disclosure-toggle";
import { useUnsavedGuardRegistration } from "@/components/unsaved-guard";
import { NOTE_TEMPLATES } from "@/lib/constants";
import { addNote } from "@/app/actions/notes";

export type NoteHistoryRow = {
  id: string;
  occurredAt: string;
  notes: string;
  staffName: string;
  source: "CALL" | "NOTE" | "MANUAL";
  durationSeconds: number;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

const VISIBLE_HISTORY_COUNT = 5;

export function NotesPanel({
  patientId,
  history,
  aiSummary,
}: {
  patientId: string;
  history: NoteHistoryRow[];
  aiSummary?: string;
}) {
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showKebabMenu, setShowKebabMenu] = useState(false);

  const [twoWayCommunication, setTwoWayCommunication] = useState(false);
  const [minutes, setMinutes] = useState<string>("");
  const [seconds, setSeconds] = useState<string>("");
  const [templateUsed, setTemplateUsed] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocalValue(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveNote() {
    if (!notes.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addNote(patientId, {
        notes,
        occurredAt: new Date(occurredAt).toISOString(),
        twoWayCommunication,
        monitoringMinutes: Number(minutes) || 0,
        monitoringSeconds: Number(seconds) || 0,
        templateUsed,
      });
      setNotes("");
      setTemplateUsed(null);
      setMinutes("");
      setSeconds("");
      setTwoWayCommunication(false);
      setOccurredAt(toDatetimeLocalValue(new Date()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  // Registers the current draft with the app-wide unsaved-changes guard —
  // switching tabs or navigating away while this is non-empty prompts to
  // save first.
  useUnsavedGuardRegistration(notes, saveNote);

  function handleChipClick(label: string, boilerplate: string) {
    setTemplateUsed(label);
    setNotes((prev) => (prev.trim() ? `${prev.trim()} ${boilerplate}` : boilerplate));
  }

  const sorted = useMemo(
    () => [...history].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()),
    [history]
  );
  const visibleHistory = showAllHistory ? sorted : sorted.slice(0, VISIBLE_HISTORY_COUNT);

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Notes</h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowKebabMenu((v) => !v)}
            aria-label="More options"
            className="rounded-md px-1.5 py-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          >
            ⋮
          </button>
          {showKebabMenu && (
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-neutral-200 bg-white py-1 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => {
                  setShowAllHistory(true);
                  setShowKebabMenu(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                View full history
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3">
        <DisclosureToggle
          expanded={showAdditionalInfo}
          onClick={() => setShowAdditionalInfo((v) => !v)}
          labelExpanded="Hide additional info"
          labelCollapsed="Additional info"
          variant="plain"
        />
        {showAdditionalInfo && (
          <div className="mt-2 space-y-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-700 dark:text-neutral-300">Two-way communication</span>
              <button
                type="button"
                role="switch"
                aria-checked={twoWayCommunication}
                onClick={() => setTwoWayCommunication((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  twoWayCommunication ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    twoWayCommunication ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-700 dark:text-neutral-300">Monitoring time</span>
              <label className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <input
                  type="number"
                  min={0}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="0"
                  className="w-14 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                />
                Min
              </label>
              <label className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  placeholder="0"
                  className="w-14 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                />
                Sec
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <DisclosureToggle
          expanded={showTemplates}
          onClick={() => setShowTemplates((v) => !v)}
          labelExpanded="Hide templates"
          labelCollapsed="Templates"
          variant="plain"
        />
        {showTemplates && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {NOTE_TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => handleChipClick(t.label, t.boilerplate)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  templateUsed === t.label
                    ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-950 dark:text-blue-300"
                    : "border-neutral-300 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Write a note…"
          className="block w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
        />
        <div className="mt-2 flex items-center gap-2">
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          />
        </div>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="button"
          onClick={() => void saveNote()}
          disabled={saving || !notes.trim()}
          className="mt-3 w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {saving ? "Saving…" : "Add Note"}
        </button>
      </div>

      {aiSummary && (
        <div className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              AI summary across visits
            </div>
            <p className="mt-1 text-neutral-700 dark:text-neutral-300">{aiSummary}</p>
          </div>
        </div>
      )}

      <div className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
        {sorted.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No notes logged yet.</p>
        ) : (
          <>
            <ul className="space-y-3">
              {visibleHistory.map((row) => (
                <li key={row.id} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                  <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                    <span>{row.staffName}</span>
                    <span>{formatDateTime(row.occurredAt)}</span>
                  </div>
                  {row.notes && <p className="mt-1 text-neutral-700 dark:text-neutral-300">{row.notes}</p>}
                </li>
              ))}
            </ul>
            {sorted.length > VISIBLE_HISTORY_COUNT && (
              <div className="mt-2">
                <DisclosureToggle
                  expanded={showAllHistory}
                  onClick={() => setShowAllHistory((v) => !v)}
                  labelExpanded="Show less"
                  labelCollapsed={`View full history (${sorted.length})`}
                  variant="plain"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
