"use client";

import { useMemo, useState } from "react";
import { PatientRosterTable, type RosterRow } from "@/components/patient-roster-table";
import { PatientDrawer } from "@/components/patient-drawer";
import { DisclosureToggle } from "@/components/disclosure-toggle";
import {
  categorizePatient,
  ROSTER_CATEGORY_ORDER,
  ROSTER_CATEGORY_LABELS,
  ROSTER_CATEGORY_DESCRIPTIONS,
  type RosterCategory,
} from "@/lib/roster-categories";

const DOT_CLASS: Record<RosterCategory, string> = {
  needs_attention: "bg-[color:var(--status-critical)]",
  monitor: "bg-[color:var(--status-warning)]",
  meeting_targets: "bg-[color:var(--status-good)]",
};

// A triage worklist rather than one flat alphabetical table: patients are
// grouped by what needs a clinician's attention first, and clicking a row
// opens a quick-glance preview instead of always jumping to the full record.
export function PracticeWorklist({ roster }: { roster: RosterRow[] }) {
  const [selected, setSelected] = useState<RosterRow | null>(null);
  const [collapsed, setCollapsed] = useState<Set<RosterCategory>>(new Set());

  const groups = useMemo(() => {
    const byCategory = new Map<RosterCategory, RosterRow[]>();
    for (const category of ROSTER_CATEGORY_ORDER) byCategory.set(category, []);
    for (const patient of roster) {
      byCategory.get(categorizePatient(patient))!.push(patient);
    }
    return byCategory;
  }, [roster]);

  function toggleCollapsed(category: RosterCategory) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
        {ROSTER_CATEGORY_ORDER.map((category) => (
          <span key={category} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${DOT_CLASS[category]}`} />
            {groups.get(category)!.length} {ROSTER_CATEGORY_LABELS[category].toLowerCase()}
          </span>
        ))}
      </div>

      {ROSTER_CATEGORY_ORDER.map((category) => {
        const rows = groups.get(category)!;
        const isCollapsed = collapsed.has(category);
        return (
          <section key={category} className="rounded-lg border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${DOT_CLASS[category]}`} />
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {ROSTER_CATEGORY_LABELS[category]}
                  </h2>
                  <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {rows.length}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {ROSTER_CATEGORY_DESCRIPTIONS[category]}
                </p>
              </div>
              <DisclosureToggle
                expanded={!isCollapsed}
                onClick={() => toggleCollapsed(category)}
                labelExpanded="Collapse"
                labelCollapsed="Expand"
                variant="pill"
              />
            </div>
            {!isCollapsed && (
              <div className="border-t border-neutral-200 dark:border-neutral-800">
                <PatientRosterTable roster={rows} onSelectPatient={setSelected} />
              </div>
            )}
          </section>
        );
      })}

      <PatientDrawer patient={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
