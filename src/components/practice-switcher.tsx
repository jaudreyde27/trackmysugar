"use client";

import { useRef } from "react";
import { switchPractice } from "@/app/actions/practice";
import { useAttemptNavigate } from "@/components/unsaved-guard";

// CDCES-only — lets a clinician switch which practice is currently active.
// Always renders when there's at least one accessible practice, even with
// only one option today, so the mechanism is fully wired for when more
// practices exist. Routes through the same unsaved-work guard as other
// navigation, since switching practices re-scopes everything just like
// leaving the page would.
export function PracticeSwitcher({
  organizations,
  currentOrganizationId,
}: {
  organizations: { id: string; name: string }[];
  currentOrganizationId: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const attemptNavigate = useAttemptNavigate();

  if (organizations.length === 0) return null;

  return (
    <form ref={formRef} action={switchPractice}>
      <select
        name="organizationId"
        defaultValue={currentOrganizationId ?? organizations[0].id}
        onChange={() => attemptNavigate(() => formRef.current?.requestSubmit())}
        aria-label="Switch practice"
        className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-200"
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </form>
  );
}
