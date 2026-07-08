"use client";

import { useState } from "react";
import { useAttemptNavigate } from "@/components/unsaved-guard";

const TABS = ["Readings", "Trends", "Devices", "Medications", "Monitoring", "Messaging", "Docs"] as const;
export type PatientTab = (typeof TABS)[number];

export function PatientTabs({
  panels,
}: {
  panels: Record<PatientTab, React.ReactNode>;
}) {
  const [active, setActive] = useState<PatientTab>("Readings");
  const attemptNavigate = useAttemptNavigate();

  function handleTabClick(tab: PatientTab) {
    if (tab === active) return;
    attemptNavigate(() => setActive(tab));
  }

  return (
    <div>
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
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
      <div className="py-4">{panels[active]}</div>
    </div>
  );
}
