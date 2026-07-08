"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useAttemptNavigate } from "@/components/unsaved-guard";
import { ChartReviewTimer } from "@/components/chart-review-timer";

const TABS = ["Readings", "Trends", "Devices", "Medications", "Monitoring", "Messaging", "Docs"] as const;
export type PatientTab = (typeof TABS)[number];

export function PatientTabs({
  panels,
  patientId,
}: {
  panels: Record<PatientTab, React.ReactNode>;
  patientId: string;
}) {
  const [active, setActive] = useState<PatientTab>("Readings");
  const attemptNavigate = useAttemptNavigate();
  const pendingScrollY = useRef<number | null>(null);

  function handleTabClick(tab: PatientTab) {
    if (tab === active) return;
    pendingScrollY.current = window.scrollY;
    attemptNavigate(() => setActive(tab));
  }

  // Switching tabs swaps in a panel of a different height, which can shrink
  // the page below the current scroll offset and make the browser clamp
  // scrollY back up — reads as an unwanted jump to the top. Restore the
  // pre-switch position (synchronously, before paint) so the page appears
  // to stay put.
  useLayoutEffect(() => {
    if (pendingScrollY.current != null) {
      window.scrollTo(0, pendingScrollY.current);
      pendingScrollY.current = null;
    }
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
        <ChartReviewTimer patientId={patientId} />
      </div>
      <div className="py-4">{panels[active]}</div>
    </div>
  );
}
