// Example helper script. Run with: npm run script -- scripts/hello.ts
//
// Node runs this .ts file directly (type stripping), so keep to erasable
// TypeScript: no enums, no namespaces, and no "@/..." path aliases — import
// with relative paths and an explicit .ts extension instead.
import { logger } from "../lib/logger.ts";

const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;

function main(): void {
  if (!supabaseUrl) {
    logger.error("NEXT_PUBLIC_SUPABASE_URL is not set — is .env.local present?");
    process.exitCode = 1;
    return;
  }

  // Log only the host, never keys.
  logger.info("Hello from Vacation Budget scripts", {
    supabaseHost: new URL(supabaseUrl).host,
  });
}

main();
