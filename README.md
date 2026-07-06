# TrackMySugar

A dashboard for a single endocrinology practice to track patients' Type 1 and
Type 2 diabetes data pulled from Dexcom Clarity (LibreView planned as a future
data source). Staff sign in, see every patient's core glucose stats on one
screen, and drill into an individual patient for full detail plus a streak
ticker counting consecutive days with data successfully transmitted from
their CGM.

This processes protected health information (PHI). Read [`docs/HIPAA.md`](docs/HIPAA.md)
before deploying anywhere near real patient data — this codebase gives you
the technical controls (encryption, audit logging, access control); HIPAA
compliance also requires organizational steps (a signed BAA with your host,
policies, workforce training) that no codebase can provide on its own.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind)
- PostgreSQL + Prisma
- Dexcom v3 API (OAuth2), sandbox by default

## Getting started (local dev)

1. **Database.** Either run Postgres via Docker:

   ```bash
   docker compose up -d db
   ```

   or point `DATABASE_URL` at any local/dev Postgres 16 instance.

2. **Environment.** Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — Postgres connection string.
   - `APP_ENCRYPTION_KEY` — `openssl rand -base64 32`. Encrypts Dexcom tokens at rest.
   - `CRON_SECRET` — `openssl rand -hex 32`. Protects the daily sync endpoint.
   - `DEXCOM_CLIENT_ID` / `DEXCOM_CLIENT_SECRET` / `DEXCOM_REDIRECT_URI` — from a
     [Dexcom developer account](https://developer.dexcom.com). Sandbox access
     (fake test patients) is available immediately after registering; real
     patient data requires Dexcom to approve a production API partnership.
   - `DEXCOM_ENVIRONMENT` — `sandbox` or `production`.

3. **Install, migrate, seed:**

   ```bash
   npm install
   npx prisma migrate dev
   npm run db:seed   # creates one admin login + a few fake sample patients
   ```

   The seed script prints the admin email/password it created (or set
   `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars to control them).

4. **Run:**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`, sign in, and connect a patient's Dexcom
   sandbox account from their patient page.

## Daily sync

The dashboard is designed to refresh once a day. Two ways to trigger it:

- **Standalone script**, for cron/systemd timers/CI schedulers:

  ```bash
  npm run sync:daily
  ```

- **HTTP endpoint**, for schedulers that can only make HTTP calls (Vercel Cron,
  GitHub Actions, etc.):

  ```bash
  curl -X POST https://your-host/api/cron/daily-sync \
    -H "Authorization: Bearer $CRON_SECRET"
  ```

Either path: for every patient with an active Dexcom connection, it refreshes
the access token if needed, pulls yesterday's EGV (glucose) readings, and
records whether that day had data. The per-patient "streak" ticker shown on
the dashboard is the count of consecutive days (walking back from yesterday)
with data successfully transmitted — a single missed or failed day resets it.

## Project layout

```
prisma/schema.prisma       Data model (patients, staff, sessions, Dexcom
                            connections, glucose readings, sync days, audit log)
src/lib/auth/               Password hashing, DB-backed sessions, login DAL
src/lib/dexcom/              Dexcom OAuth2 client, token refresh, EGV fetch
src/lib/sync/                Daily sync job + streak calculation
src/lib/data/                Read-side data-access layer (roster & patient DTOs)
src/lib/crypto.ts            AES-256-GCM helper for encrypting tokens at rest
src/lib/audit.ts             HIPAA-style access logging
src/app/                     Pages, Server Actions, and API routes
scripts/daily-sync.ts        CLI entry point for the daily sync job
```

## Testing changes

```bash
npm run lint
npx tsc --noEmit
npm run build
```

There's no automated test suite yet; changes should be exercised manually
against the sandbox Dexcom environment before shipping.
