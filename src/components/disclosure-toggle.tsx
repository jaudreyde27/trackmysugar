"use client";

// "pill" (default) is a bordered button — used where the element needs to
// visually announce itself as clickable in an otherwise plain area (e.g.
// "Show contact & insurance details" sitting right under a heading).
// "plain" is a lighter chevron+text treatment for collapsibles nested
// inside an already-bordered card (e.g. the Notes panel's internal
// sections), where a second pill-in-a-box reads as visual clutter.
export function DisclosureToggle({
  expanded,
  onClick,
  labelExpanded,
  labelCollapsed,
  variant = "pill",
}: {
  expanded: boolean;
  onClick: () => void;
  labelExpanded: string;
  labelCollapsed: string;
  variant?: "pill" | "plain";
}) {
  const className =
    variant === "pill"
      ? "inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
      : "inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200";

  return (
    <button type="button" onClick={onClick} aria-expanded={expanded} className={className}>
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
      {expanded ? labelExpanded : labelCollapsed}
    </button>
  );
}
