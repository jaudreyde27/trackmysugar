# Deploying a preview to Vercel

This sets up a **dev/preview** deployment for clicking through the live UI
instead of screenshots. It uses synthetic seed data only — see
[`HIPAA.md`](./HIPAA.md) before ever pointing a deployment like this at real
patient data. Vercel's standard plans don't offer a BAA (Business Associate
Agreement); only Vercel Enterprise does. This preview is not a production
home — the plan is to move to a HIPAA-eligible host (AWS/GCP/Azure, or a
healthcare-focused PaaS like Aptible) once real patients are involved. See
"Staying portable" below for the rules that keep that move cheap.

## Staying portable

Vercel is temporary; the data layer isn't allowed to know that. Rules to
keep following as the app grows:

- **Postgres only, via `DATABASE_URL`.** Never use Vercel Postgres, Vercel
  KV, or Vercel Blob — they don't exist off Vercel. Neon here is a
  placeholder for "any managed Postgres reachable by connection string";
  swapping it for RDS/Cloud SQL/Azure Postgres/self-hosted later is a config
  change, not a code change.
- **All access through Prisma.** No raw platform SDKs for reading/writing
  patient data — Prisma's the only thing that needs to know it's talking to
  Postgres specifically.
- **Secrets stay in `process.env`.** Every new secret gets added to
  `.env.example` with a comment, the same contract regardless of host.
- **Scheduled jobs are plain functions with a thin HTTP wrapper.**
  `runDailySync()` (`src/lib/sync/run.ts`) has no idea Vercel Cron exists —
  the route just accepts a bearer-authenticated GET/POST. Whatever schedules
  it later (EventBridge, Cloud Scheduler, plain crontab) just needs to hit
  that URL.
- **No Edge Runtime.** Everything runs on the Node.js runtime already
  (nothing opts into `export const runtime = "edge"`), which is what a
  self-hosted Docker container or any of AWS/GCP/Azure expects.
- **File storage, if it's ever added** (the Docs tab is currently a stub):
  reach for the S3 API, not Vercel Blob — S3 itself, or an S3-compatible
  backend (R2, GCS, MinIO) all speak the same protocol, so the storage
  backend becomes a config change too.
- **AI calls stay behind a swappable interface**, as `talking-points.ts` and
  `notes-summary.ts` already do (and already fail safe to a rule-based
  fallback with no key set) — don't let a vendor SDK leak into route
  handlers or components directly.

`next.config.ts` sets `output: "standalone"` so `docker build` works
unmodified whenever that move happens — Vercel ignores the setting and uses
its own build pipeline in the meantime.

## 1. Database: Neon (or any managed Postgres)

Vercel's serverless functions can't reach the `docker-compose` Postgres used
for local dev — you need a real reachable Postgres instance.
[Neon](https://neon.tech) has a free tier and is the least friction:

1. Create a Neon project, copy the connection string it gives you (it looks
   like `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`).
2. Run migrations + seed once, using **either** of:
   - **From your own machine**, if you've got Node installed and don't mind a
     terminal:
     ```bash
     DATABASE_URL="<neon-connection-string>" npx prisma migrate deploy
     DATABASE_URL="<neon-connection-string>" npm run db:seed
     ```
   - **From GitHub Actions** (`.github/workflows/db-setup.yml`), if you'd
     rather not run anything locally: add a repo secret named
     `DATABASE_URL` (Settings → Secrets and variables → Actions → New
     repository secret) with the Neon connection string, then go to the
     **Actions** tab → **Database setup (migrate + seed)** → **Run
     workflow**. Runs entirely on GitHub's servers — nothing installed or
     computed on your machine, and it works identically from any device you
     log into GitHub from. Uncheck "run_seed" on any re-run after the first
     (the seed data isn't safe to load twice).

   Either way, do this as a one-off, not as part of the Vercel build — you
   don't want migrations/seeding re-running on every deploy.

## 2. Connect the repo to Vercel

1. [vercel.com/new](https://vercel.com/new) → import this GitHub repo →
   select this branch.
2. Framework preset: Next.js (auto-detected). Build command and install
   command are already correct via `package.json` (`postinstall` runs
   `prisma generate`, which the custom Prisma output path
   `src/generated/prisma` needs on every fresh install).

## 3. Environment variables

Set these in the Vercel project's Settings → Environment Variables (see
`.env.example` for the full description of each):

| Variable | Value for this preview |
| --- | --- |
| `DATABASE_URL` | the Neon connection string from step 1 |
| `APP_ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `CRON_SECRET` | `openssl rand -hex 32` — also used by `vercel.json`'s cron entry, which Vercel authorizes automatically |
| `SESSION_IDLE_TIMEOUT_MINUTES` | `30` |
| `DEXCOM_ENVIRONMENT` | `sandbox` |
| `DEXCOM_CLIENT_ID` / `DEXCOM_CLIENT_SECRET` | only if you want live Dexcom sandbox connect to work; leave unset otherwise |
| `DEXCOM_REDIRECT_URI` | `https://<your-vercel-domain>/api/dexcom/callback` |
| `ANTHROPIC_API_KEY` | **leave unset** — no BAA is in place for this preview, and the app falls back to a rule-based summary automatically |

## 4. Deploy

Push to the connected branch; Vercel builds and gives you a URL. Every
subsequent push redeploys automatically, so the live dashboard reflects
whatever's on the branch without you doing anything further.

## Daily sync

`vercel.json` schedules `GET /api/cron/daily-sync` once a day; Vercel signs
that request with `CRON_SECRET` for you. Vercel Cron is UTC and, on the
Hobby plan, limited to once-daily granularity — fine for this job.
