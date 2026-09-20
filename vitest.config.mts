import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));

// Date maths (trip days, "today"/"yesterday" headings) must not depend on the
// machine's timezone, so every test run uses UTC.
process.env.TZ = "UTC";

// Unit tests cover the business logic (lib/, including the SDK services) and
// the domain mappers in types/. UI components and Next.js route files aren't
// part of the coverage target; neither are the thin Next/Supabase runtime
// adapters excluded below, which only work inside a real request.
export default defineConfig({
  resolve: { alias: { "@": root } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "types/**/*.ts"],
      exclude: [
        "**/*.d.ts",
        "lib/supabase/**",
        "lib/sdk/server.ts",
        "lib/i18n/server.ts",
        "lib/i18n/types.ts",
        "lib/client-ip.ts",
      ],
      reporter: ["text", "text-summary"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
