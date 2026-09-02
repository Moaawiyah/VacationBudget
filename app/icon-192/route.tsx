import { renderAppIcon } from "@/lib/pwa-icon";

// A plain Route Handler (not the special `icon` file convention) so the URL
// is stable and predictable — manifest.ts needs a fixed `src`, not the
// query-hashed path Next generates for its own auto-injected <link> icons.
export async function GET() {
  return renderAppIcon(192);
}
