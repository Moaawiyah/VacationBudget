import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle (.next/standalone) — this is what
  // lets Railway run `node server.js` instead of needing a full npm install at
  // runtime. See Phase 10 (deployment) for how this gets used.
  output: "standalone",
  experimental: {
    // Detects connectivity loss and automatically retries a blocked
    // navigation or Server Action once the connection returns, instead of
    // throwing. This is what keeps a submitted expense from being silently
    // lost if the network drops mid-save — no custom offline queue needed.
    // Doesn't help a cold load with zero prior connectivity (that needs a
    // service worker); see the note where <OfflineBanner> is used.
    useOffline: true,
  },
};

export default nextConfig;
