import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle (.next/standalone) — this is what
  // lets Railway run `node server.js` instead of needing a full npm install at
  // runtime. See Phase 10 (deployment) for how this gets used.
  output: "standalone",
};

export default nextConfig;
