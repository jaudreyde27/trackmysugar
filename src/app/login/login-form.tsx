"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

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
