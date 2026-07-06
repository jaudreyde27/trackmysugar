"use client";

import { useEffect, useState } from "react";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function CallTimer({ startedAt }: { startedAt: string }) {
  // Starts null so the server-rendered markup and the client's first
  // (pre-mount) render match exactly — the real elapsed time is only known
  // once we're on the client, so computing it eagerly would mismatch SSR.
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setElapsed(Date.now() - new Date(startedAt).getTime());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="font-mono text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
      {elapsed == null ? "0:00" : formatElapsed(elapsed)}
    </span>
  );
}
