import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { getActiveCallSession, getRecentCallSessions } from "@/lib/data/cdces";
import { TopNav } from "@/components/top-nav";
import { CallNotesEditor } from "@/components/call-notes-editor";
import { CallTimer } from "@/components/call-timer";
import { startCdcesCall, endCdcesCall } from "@/app/actions/cdces";

function formatDateTime(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(start: Date, end: Date): string {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return `${minutes} min`;
}

export default async function CdcesCallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  const { id } = await params;

  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) notFound();

  const [activeCall, recentCalls] = await Promise.all([
    getActiveCallSession(id),
    getRecentCallSessions(id, 5),
  ]);

  const boundStart = startCdcesCall.bind(null, id);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav staffName={session.staffUser.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <Link
          href={`/patients/${id}`}
          className="text-sm text-neutral-500 hover:underline dark:text-neutral-400"
        >
          ← {patient.lastName}, {patient.firstName}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          CDCES call
        </h1>

        {!activeCall ? (
          <section className="mt-6 rounded-lg border border-neutral-200 p-6 text-center dark:border-neutral-800">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Ready to call {patient.firstName} {patient.lastName} (MRN {patient.mrn}).
            </p>
            <form action={boundStart} className="mt-4">
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
              >
                Initiate call
              </button>
            </form>
          </section>
        ) : (
          <section className="mt-6 space-y-6">
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <div>
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Call in progress
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Started {formatDateTime(activeCall.startedAt)}
                </div>
              </div>
              <CallTimer startedAt={activeCall.startedAt.toISOString()} />
            </div>

            <div>
              <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Key talking points
              </h2>
              <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-300">
                <ul className="list-inside list-disc space-y-1">
                  {(activeCall.talkingPoints ?? "")
                    .split("\n")
                    .map((line) => line.replace(/^[-*]\s*/, "").trim())
                    .filter(Boolean)
                    .map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                </ul>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Call notes
              </h2>
              <div className="mt-2">
                <CallNotesEditor sessionId={activeCall.id} initialNotes={activeCall.notes} />
              </div>
            </div>

            <form action={endCdcesCall.bind(null, activeCall.id, id)}>
              <button
                type="submit"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                End call
              </button>
            </form>
          </section>
        )}

        {recentCalls.filter((c) => c.id !== activeCall?.id).length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Past touchpoints
            </h2>
            <ul className="mt-2 divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-900 dark:border-neutral-800">
              {recentCalls
                .filter((c) => c.id !== activeCall?.id)
                .map((c) => (
                  <li key={c.id} className="px-4 py-3 text-sm">
                    <div className="flex justify-between text-neutral-700 dark:text-neutral-300">
                      <span>{formatDateTime(c.startedAt)}</span>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        {c.endedAt ? formatDuration(c.startedAt, c.endedAt) : "ended without closing"}
                      </span>
                    </div>
                    {c.notes && (
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {c.notes}
                      </p>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
