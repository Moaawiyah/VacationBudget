import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/navigation/logout-button";

// Placeholder — full trip list + creation UI lands in Phase 2.
export default async function TripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="safe-top safe-x safe-bottom flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold">Trips</h1>
        <p className="text-muted-foreground mt-1 text-sm">Signed in as {user?.email}</p>
      </div>
      <div className="border-border bg-card text-muted-foreground rounded-3xl border p-6 text-sm">
        Trip creation and listing are next (Phase 2).
      </div>
      <LogoutButton />
    </main>
  );
}
