import { prisma } from "@/lib/db";
import { verifyOAuthState } from "@/lib/dexcom/state";
import { getDexcomAuthorizationUrl } from "@/lib/dexcom/client";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "It looks like you declined the Dexcom authorization. You can try again below.",
  connect_failed: "Something went wrong connecting your account. Please try again.",
  missing_code: "Something went wrong connecting your account. Please try again.",
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {children}
      </div>
    </div>
  );
}

export default async function EnrollPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const payload = verifyOAuthState(token);
  if (!payload) {
    return (
      <Card>
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          This link has expired
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Please contact your care team for a new link.
        </p>
      </Card>
    );
  }

  const patient = await prisma.patient.findFirst({
    where: { id: payload.patientId, active: true },
    select: {
      firstName: true,
      organization: { select: { name: true } },
      dexcomConnection: { select: { status: true } },
    },
  });

  if (!patient) {
    return (
      <Card>
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          This link isn&apos;t valid
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Please contact your care team for a new link.
        </p>
      </Card>
    );
  }

  if (patient.dexcomConnection?.status === "ACTIVE") {
    return (
      <Card>
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          You&apos;re connected
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Your Dexcom account is already sharing data with {patient.organization?.name ?? "your care team"}.
          You can close this page.
        </p>
      </Card>
    );
  }

  const authUrl = getDexcomAuthorizationUrl(token);

  return (
    <Card>
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Hi {patient.firstName},
      </h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {patient.organization?.name ?? "Your care team"} would like to connect to your Dexcom account so
        they can monitor your glucose readings between visits.
      </p>
      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
        </p>
      )}
      <a
        href={authUrl}
        className="mt-5 block w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        Connect my Dexcom account
      </a>
      <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
        You&apos;ll be taken to Dexcom&apos;s site to sign in and approve sharing.
      </p>
    </Card>
  );
}
