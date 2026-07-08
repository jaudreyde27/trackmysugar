# Deploying a preview to Vercel

This sets up a **dev/preview** deployment for clicking through the live UI
instead of screenshots. It uses synthetic seed data only — see
[`HIPAA.md`](./HIPAA.md) before ever pointing a deployment like this at real
patient data. Vercel's standard plans don't offer a BAA (Business Associate
Agreement); only Vercel Enterprise does. This preview is not a production
home.

## 1. Database: Neon (or any managed Postgres)

Vercel's serverless functions can't reach the `docker-compose` Postgres used
for local dev — you need a real reachable Postgres instance.
[Neon](https://neon.tech) has a free tier and is the least friction:

1. Create a Neon project, copy the connection string it gives you (it looks
   like `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`).
2. From your machine, point Prisma at it and run migrations + seed once:
   ```bash
   DATABASE_URL="<neon-connection-string>" npx prisma migrate deploy
   DATABASE_URL="<neon-connection-string>" npm run db:seed
   ```
   Do this from your own machine, not as part of the Vercel build — you
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
