import { getOptionalSession } from "@/lib/auth/dal";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getOptionalSession();
  if (session) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            TrackMySugar
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Staff sign in
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
