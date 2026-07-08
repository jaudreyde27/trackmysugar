import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained .next/standalone server bundle so `docker build`
  // + `node .next/standalone/server.js` works unmodified once we move off
  // Vercel to a HIPAA-eligible host (AWS/GCP/Azure/Aptible) — see
  // docs/DEPLOY.md. Vercel does NOT ignore this setting — it conflicts with
  // Vercel's own build/packaging pipeline and produces a blanket 404 on
  // every route if left on, so it's skipped when building on Vercel (which
  // sets the VERCEL env var automatically).
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),

  // Next's serverless function bundler only auto-detects Prisma's engine
  // binary when it lives at the default node_modules/.prisma/client path.
  // schema.prisma points it at src/generated/prisma instead, so the binary
  // gets silently dropped from the deployed function unless told explicitly.
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
