import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained .next/standalone server bundle in addition to
  // the normal build output. Vercel ignores this and uses its own build
  // output API either way, but it's what makes `docker build` + `node
  // .next/standalone/server.js` work unmodified once we move off Vercel to
  // a HIPAA-eligible host (AWS/GCP/Azure/Aptible) — see docs/DEPLOY.md.
  output: "standalone",
};

export default nextConfig;
