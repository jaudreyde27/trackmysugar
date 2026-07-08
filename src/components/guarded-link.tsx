"use client";

import { useRouter } from "next/navigation";
import { useAttemptNavigate } from "@/components/unsaved-guard";

// A drop-in replacement for next/link's Link that routes through the
// unsaved-changes guard — used for links that lead away from a page that
// might have an unsaved note draft (e.g. back to the dashboard). Falls
// back to a plain navigation when rendered outside an UnsavedGuardProvider.
export function GuardedLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const attemptNavigate = useAttemptNavigate();

  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        // Let ctrl/cmd/shift/middle-click behave like a normal link (open
        // in new tab, etc.) instead of hijacking it into a client-side
        // navigation the guard would intercept.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        attemptNavigate(() => router.push(href));
      }}
    >
      {children}
    </a>
  );
}
