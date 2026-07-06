# HIPAA compliance notes

This app stores and displays protected health information (PHI): patient
names, dates of birth, diabetes diagnoses, and continuous glucose monitor
readings. HIPAA compliance is a property of an organization's people,
policies, and infrastructure as a whole — a codebase can only provide the
**technical safeguards** the HIPAA Security Rule calls for. This document
lists what's implemented here, and — just as important — what is explicitly
*not* handled by this code and needs to be arranged separately before real
patient data touches this system.

## Technical safeguards implemented here

- **Encryption in transit**: enforced at the host/proxy level (see
  "What you still need to arrange" below) — the app sets `Secure` cookies and
  expects to run behind TLS in any non-local environment.
- **Encryption at rest for secrets**: Dexcom OAuth access/refresh tokens are
  encrypted with AES-256-GCM (`src/lib/crypto.ts`) before being written to the
  database, keyed by `APP_ENCRYPTION_KEY`. This is on top of whatever
  disk/volume encryption your database host provides.
- **Authentication**: staff passwords are hashed with bcrypt (cost 12,
  `src/lib/auth/password.ts`). A dummy-hash comparison on unknown emails
  prevents user enumeration via timing.
- **Session management**: sessions are database-backed
  (`src/lib/auth/session.ts`) — the cookie holds only a random opaque token;
  the database stores a SHA-256 hash of it, never the token itself. Sessions
  carry both an idle timeout (`SESSION_IDLE_TIMEOUT_MINUTES`, default 30) and
  a 12-hour absolute expiry, and can be revoked server-side immediately
  (logout, or an admin disabling a `StaffUser`).
- **Authorization / minimum necessary access**: every page and route handler
  calls `verifySession()` (`src/lib/auth/dal.ts`) before touching patient
  data — there's no code path that reads PHI without an authenticated
  session. Data-access functions (`src/lib/data/*`) return only the fields
  the UI needs, not raw database rows.
- **Audit logging**: `src/lib/audit.ts` records every login attempt (success
  and failure), every patient record view, and every Dexcom
  connect/disconnect action, with the acting staff user, patient, action,
  timestamp, and source IP. This is the record you'd pull for a HIPAA
  accounting-of-disclosures request or a security investigation.
- **CSRF protection on the Dexcom OAuth flow**: the `state` parameter is
  HMAC-signed and time-limited (10 minutes, `src/lib/dexcom/state.ts`), so a
  forged callback can't attach stolen tokens to the wrong patient.
- **Login throttling**: naive in-memory rate limiting on the login action
  (`src/lib/auth/rate-limit.ts`) — see the caveat below before relying on this
  in a multi-instance deployment.
- **Cron endpoint protection**: `/api/cron/daily-sync` requires a bearer
  secret compared with a timing-safe equality check, not a plain `===`.

## What you still need to arrange before real PHI goes in

None of the following can be satisfied by code alone:

1. **A signed Business Associate Agreement (BAA) with your hosting
   provider** before any real patient data is stored or processed on their
   infrastructure. This is non-negotiable under HIPAA and has to happen
   before go-live, not after.
2. **Dexcom's data protection terms**: as part of applying for Dexcom
   production API access (beyond sandbox), confirm what data protection /
   BAA terms Dexcom offers for your use case. Sandbox data is fake, so this
   only matters once you move to `DEXCOM_ENVIRONMENT=production`.
3. **Centralized secrets management.** `.env` files are fine for local dev;
   in staging/production, `APP_ENCRYPTION_KEY`, `DEXCOM_CLIENT_SECRET`, and
   `CRON_SECRET` belong in your platform's secrets manager, not in a file on
   disk. Losing `APP_ENCRYPTION_KEY` makes every stored Dexcom token
   unrecoverable — back it up somewhere separate from the database.
4. **TLS termination + HSTS** at your load balancer/reverse proxy/platform
   (Vercel, an ALB, Caddy, etc.) — this app doesn't terminate TLS itself.
5. **Backups**: encrypted, access-controlled, and with a periodically tested
   restore procedure.
6. **A shared rate-limit store** (e.g. Redis) if you ever run more than one
   app instance — the built-in limiter is per-process and won't coordinate
   across instances.
7. **Multi-factor authentication for staff logins.** This MVP only does
   password auth. Add MFA before treating this as production-ready — a
   dedicated auth provider (see the list in
   `node_modules/next/dist/docs/01-app/02-guides/authentication.md`) is the
   fastest way to get there.
8. **Organizational controls**: a written security/privacy policy, workforce
   HIPAA training, a designated privacy/security officer, an access-review
   cadence (who can see the audit log and how often it's reviewed), a
   breach-notification procedure, and a sanctions policy for misuse — all
   required by the Security Rule's administrative safeguards, none of which
   live in a repository.
9. **A security review / penetration test** before go-live, and periodically
   afterward — see the `security-review` skill in this environment as a
   starting point, but a from-scratch clinical app handling PHI warrants an
   independent third-party review too.
10. **Data retention and disposal policy**: decide how long glucose readings,
    audit logs, and revoked-connection records are retained, and implement
    the deletion job — this codebase does not currently expire or purge
    anything automatically.

## Data minimization

The `Patient` model intentionally stores only what the dashboard needs
(name, DOB, MRN, diabetes type) — no SSN, address, or contact info. Keep
that discipline as the schema grows: add a field only when a feature needs
it, and prefer referencing an external EHR record over duplicating more PHI
here than necessary.
