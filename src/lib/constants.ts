// Plain constants with zero runtime dependencies, safe to import from
// Client Components — unlike the modules that compute the metrics using
// them (e.g. src/lib/sync/streak.ts), which pull in the Prisma client and
// so must stay Server-Component-only.
export const R30_WINDOW_DAYS = 30;
