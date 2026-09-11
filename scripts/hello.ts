// Example helper script. Run with: npm run script -- scripts/hello.ts
//
// Node runs this .ts file directly (type stripping), so keep to erasable
// TypeScript: no enums, no namespaces, and no "@/..." path aliases — import
// with relative paths and an explicit .ts extension instead.

const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;

function main(): void {
  if (!supabaseUrl) {
    console.error("NEXT_PUBLIC_SUPABASE_URL is not set — is .env.local present?");
    process.exitCode = 1;
    return;
  }

  // Print only the host, never keys.
  console.log(
    `Hello from Vacation Budget scripts (Supabase: ${new URL(supabaseUrl).host})`,
  );
}

main();
