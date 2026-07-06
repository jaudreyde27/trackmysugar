"use client";

import { useRef, useState } from "react";
import { updateCallNotes } from "@/app/actions/cdces";

const AUTOSAVE_DELAY_MS = 1500;

export function CallNotesEditor({
  sessionId,
  initialNotes,
}: {
  sessionId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleSave(value: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => save(value), AUTOSAVE_DELAY_MS);
  }

  async function save(value: string) {
    setStatus("saving");
    await updateCallNotes(sessionId, value);
    setStatus("saved");
  }

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          scheduleSave(e.target.value);
        }}
        onBlur={() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          save(notes);
        }}
        rows={10}
        placeholder="Live call notes…"
        className="block w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
      />
      <div className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : " "}
      </div>
    </div>
  );
}
