"use client";

import { useMemo, useState } from "react";
import { DisclosureToggle } from "@/components/disclosure-toggle";
import { useUnsavedGuardRegistration } from "@/components/unsaved-guard";
import { NOTE_TEMPLATES } from "@/lib/constants";
import { addNote } from "@/app/actions/notes";
import { logRpmCallTime } from "@/app/actions/monitoring";

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

function todayDateValue(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const VISIBLE_HISTORY_COUNT = 5;

export function NotesPanel({
  patientId,
  history,
  aiSummary,
  canManage,
}: {
  patientId: string;
  history: NoteHistoryRow[];
  aiSummary?: string;
  canManage: boolean;
}) {
  const [showCallTimeForm, setShowCallTimeForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showKebabMenu, setShowKebabMenu] = useState(false);

  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [callDate, setCallDate] = useState(() => todayDateValue());
  const [callStartTime, setCallStartTime] = useState("");
  const [callEndTime, setCallEndTime] = useState("");
  const [loggingCallTime, setLoggingCallTime] = useState(false);
  const [callTimeError, setCallTimeError] = useState<string | null>(null);

  async function saveNote() {
    if (!notes.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addNote(patientId, {
        notes,
        occurredAt: new Date().toISOString(),
        templateUsed: selectedTemplates.length ? selectedTemplates.join(", ") : null,
      });
      setNotes("");
      setSelectedTemplates([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function saveCallTime() {
    if (!callStartTime || !callEndTime) return;
    setLoggingCallTime(true);
    setCallTimeError(null);
    try {
      await logRpmCallTime(patientId, { date: callDate, startTime: callStartTime, endTime: callEndTime });
      setCallStartTime("");
      setCallEndTime("");
      setCallDate(todayDateValue());
    } catch (err) {
      setCallTimeError(err instanceof Error ? err.message : "Failed to log call time");
    } finally {
      setLoggingCallTime(false);
    }
  }

  // Registers the current draft with the app-wide unsaved-changes guard —
  // navigating away while this is non-empty prompts to save first.
  useUnsavedGuardRegistration("notes", "Unsaved note", notes, saveNote);

  function removeBoilerplate(text: string, boilerplate: string): string {
    return text.replace(boilerplate, "").replace(/\s{2,}/g, " ").trim();
  }

  // Templates are independently toggleable — several can be active at
  // once (e.g. "Left Voicemail" + "Chart Comment" on the same visit).
  // Selecting a chip appends its boilerplate; deselecting it pulls just
  // that boilerplate back out, leaving the rest of the note untouched.
  function handleChipClick(label: string, boilerplate: string) {
    if (selectedTemplates.includes(label)) {
      setSelectedTemplates((prev) => prev.filter((l) => l !== label));
      setNotes((prev) => removeBoilerplate(prev, boilerplate));
      return;
    }

    setSelectedTemplates((prev) => [...prev, label]);
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
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">CDCES Notes</h2>
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

      {canManage && (
      <>
      <div className="px-4 py-3">
        <DisclosureToggle
          expanded={showCallTimeForm}
          onClick={() => setShowCallTimeForm((v) => !v)}
          labelExpanded="Hide RPM call time form"
          labelCollapsed="Log RPM Call Time"
          variant="plain"
        />
        {showCallTimeForm && (
          <div className="mt-2 space-y-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-neutral-500 dark:text-neutral-400">
                Date
                <input
                  type="date"
                  value={callDate}
                  onChange={(e) => setCallDate(e.target.value)}
                  className="mt-0.5 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                />
              </label>
              <label className="text-xs text-neutral-500 dark:text-neutral-400">
                Start time
                <input
                  type="time"
                  value={callStartTime}
                  onChange={(e) => setCallStartTime(e.target.value)}
                  className="mt-0.5 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                />
              </label>
              <label className="text-xs text-neutral-500 dark:text-neutral-400">
                End time
                <input
                  type="time"
                  value={callEndTime}
                  onChange={(e) => setCallEndTime(e.target.value)}
                  className="mt-0.5 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                />
              </label>
            </div>
            {callTimeError && <p className="text-xs text-red-600 dark:text-red-400">{callTimeError}</p>}
            <button
              type="button"
              onClick={() => void saveCallTime()}
              disabled={loggingCallTime || !callStartTime || !callEndTime}
              className="w-full rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
            >
              {loggingCallTime ? "Logging…" : "Log call time"}
            </button>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Counts toward this patient&apos;s monthly RPM monitoring time alongside live calls and chart time.
            </p>
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
                aria-pressed={selectedTemplates.includes(t.label)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedTemplates.includes(t.label)
                    ? "border-accent-border bg-accent-subtle text-accent"
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
          className="block w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-border/40 dark:border-neutral-700 dark:bg-neutral-950"
        />
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="button"
          onClick={() => void saveNote()}
          disabled={saving || !notes.trim()}
          className="mt-3 w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add Note"}
        </button>
      </div>
      </>
      )}

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
