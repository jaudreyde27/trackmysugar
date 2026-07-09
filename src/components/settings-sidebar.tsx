import Link from "next/link";

const NAV_ITEMS = [{ href: "/settings/reimbursement-rates", label: "Reimbursement Rates" }] as const;

export function SettingsSidebar({ active }: { active: string }) {
  return (
    <aside className="w-56 shrink-0 border-r border-neutral-200 pr-4 dark:border-neutral-800">
      <nav className="space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              item.label === active
                ? "block rounded-md bg-accent-subtle px-2.5 py-1.5 text-sm font-medium text-accent"
                : "block rounded-md px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
