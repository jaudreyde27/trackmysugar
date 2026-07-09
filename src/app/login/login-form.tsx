"use client";

import { useActionState, useEffect, useRef } from "react";
import { login } from "@/app/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // React resets every uncontrolled field in the form once the action
  // returns — including email, which the browser shouldn't touch. Left
  // alone, a blank required email field silently blocks the next
  // submission's HTML5 validation with no visible feedback, so retrying
  // after a failed attempt looks like the page just stopped responding.
  // Restore the email that was actually submitted, clear only the
  // password, and refocus it for an immediate retry.
  useEffect(() => {
    if (state?.error) {
      if (emailRef.current) emailRef.current.value = state.email;
      if (passwordRef.current) {
        passwordRef.current.value = "";
        passwordRef.current.focus();
      }
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-neutral-200 border-t-4 border-t-accent bg-white p-6 shadow-sm dark:border-neutral-800 dark:border-t-accent dark:bg-neutral-900"
    >
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          ref={emailRef}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-border/40 dark:border-neutral-700 dark:bg-neutral-950"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          ref={passwordRef}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-border/40 dark:border-neutral-700 dark:bg-neutral-950"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
