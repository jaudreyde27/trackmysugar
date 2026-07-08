import Link from "next/link";

const NAV_ITEMS = [
  { href: "/admin/accounts", label: "Accounts Overview" },
  { href: "/admin", label: "Overview Reports" },
  { href: "/admin/tools", label: "Tools" },
  { href: "/admin/orders", label: "Orders" },
] as const;

export function AdminSidebar({ active, orgName }: { active: string; orgName: string }) {
  return (
    <aside className="w-56 shrink-0 border-r border-neutral-200 pr-4 dark:border-neutral-800">
      <div className="mb-4">
        <label className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Organization</label>
        <select
          disabled
          className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400"
        >
          <option>{orgName}</option>
        </select>
      </div>
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
