import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Security headers applied to every response. The CSP allows 'unsafe-inline'
// scripts/styles because Next.js inlines hydration data in <script> tags and
// Tailwind injects styles — a per-request nonce would forbid that unless every
// page is dynamically rendered (see the CSP guide in node_modules/next/dist/docs).
// External script/style/font loading is still fully blocked.
const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle (.next/standalone) — this is what
  // lets Railway run `node server.js` instead of needing a full npm install at
  // runtime. See Phase 10 (deployment) for how this gets used.
  output: "standalone",
  // Dev-server only: lets a phone on the same WiFi network load JS bundles
  // when testing via the Mac's local IP (e.g. Add to Home Screen testing).
  // Without this, Next's dev-mode cross-origin protection silently blocks
  // the bundle, React never hydrates, and forms fall back to a raw HTML GET
  // submit — which is exactly what happened testing login from the iPhone.
  // Has no effect on production (Railway serves a real domain, not dev mode).
  allowedDevOrigins: ["10.0.0.25"],
  experimental: {
    // Detects connectivity loss and automatically retries a blocked
    // navigation or Server Action once the connection returns, instead of
    // throwing. This is what keeps a submitted expense from being silently
    // lost if the network drops mid-save — no custom offline queue needed.
    // Doesn't help a cold load with zero prior connectivity (that needs a
    // service worker); see the note where <OfflineBanner> is used.
    useOffline: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
