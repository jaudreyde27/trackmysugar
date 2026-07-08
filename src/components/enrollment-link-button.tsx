"use client";

import { useState } from "react";
import { generateEnrollmentLink } from "@/app/actions/enrollment";

// Staff never authorize a patient's Dexcom account themselves — this
// generates a link the *patient* opens to connect their own account, and
// copies it so staff can send it however they reach patients (text, email,
// portal message). No "Connect to Dexcom" action happens in this app.
export function EnrollmentLinkButton({ patientId, isError }: { patientId: string; isError: boolean }) {
  const [state, setState] = useState<"idle" | "generating" | "copied" | "error">("idle");

  async function handleClick() {
    setState("generating");
    try {
      const url = await generateEnrollmentLink(patientId);
      await navigator.clipboard.writeText(url);
      setState("copied");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "generating"}
      className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
    >
      {state === "generating" && "Generating…"}
      {state === "copied" && "Copied! Send it to the patient"}
      {state === "error" && "Couldn't generate link"}
      {state === "idle" && (isError ? "Copy reconnect link" : "Copy enrollment link")}
    </button>
  );
}
