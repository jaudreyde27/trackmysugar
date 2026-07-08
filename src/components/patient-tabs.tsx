"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChartReviewTimerControls } from "@/components/chart-review-timer";

const TABS = ["Readings", "Trends", "Devices", "Medications", "RPM History", "Docs"] as const;
export type PatientTab = (typeof TABS)[number];

export function PatientTabs({
  panels,
  canManage,
}: {
  panels: Record<PatientTab, React.ReactNode>;
  canManage: boolean;
}) {
  const [active, setActive] = useState<PatientTab>("Readings");
  const pendingScrollY = useRef<number | null>(null);

  // Switching tabs no longer risks losing an unsaved note — the notes
  // column lives outside these swapped panels and never unmounts — so
  // this can navigate directly instead of routing through the
  // unsaved-changes guard.
  function handleTabClick(tab: PatientTab) {
    if (tab === active) return;
    pendingScrollY.current = window.scrollY;
    setActive(tab);
  }

  // Switching tabs swaps in a panel of a different height, which can shrink
  // the page below the current scroll offset and make the browser clamp
  // scrollY back up — reads as an unwanted jump to the top. Restore the
  // pre-switch position synchronously (before paint), then keep
  // re-asserting it for a few frames — some panel content (charts, etc.)
  // finishes sizing itself asynchronously after mount and can trigger a
  // second, later clamp that the one-shot restore wouldn't catch.
  useLayoutEffect(() => {
    if (pendingScrollY.current == null) return;
    const target = pendingScrollY.current;
    pendingScrollY.current = null;
    window.scrollTo(0, target);

    let frames = 0;
    let rafId = requestAnimationFrame(function reassert() {
      window.scrollTo(0, target);
      frames += 1;
      if (frames < 10) {
        rafId = requestAnimationFrame(reassert);
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [active]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabClick(tab)}
              className={
                tab === active
                  ? "border-b-2 border-accent px-3 py-2 text-sm font-medium text-accent"
                  : "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              }
            >
              {tab}
            </button>
          ))}
        </div>
        {canManage && <ChartReviewTimerControls />}
      </div>
      <div className="py-4">{panels[active]}</div>
    </div>
  );
}
