import { Sidebar } from "@/components/sidebar";
import type { CurrentSession } from "@/lib/auth/session";

// `min-w-0` is load-bearing: without it, this flex child refuses to shrink
// below its content's natural width (the roster table, in particular),
// which would push the whole page into horizontal scroll instead of
// letting the table's own overflow-x-auto wrapper handle it internally.
export function AppShell({ session, children }: { session: CurrentSession; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar session={session} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
