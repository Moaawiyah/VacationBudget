import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const [supabase, dict] = await Promise.all([createClient(), getDictionary()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/trips");
  }

  return (
    <main className="safe-top safe-x safe-bottom flex flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="border-border bg-card w-full max-w-sm rounded-3xl border p-8 text-center shadow-sm">
        <div className="bg-primary mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl">
          ✈️
        </div>
        <h1 className="text-card-foreground text-xl font-semibold">Vacation Budget</h1>
        <p className="text-muted-foreground mt-2 text-sm">{dict.landing.tagline}</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link href="/register">
          <Button>{dict.landing.getStarted}</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary">{dict.landing.logIn}</Button>
        </Link>
      </div>
    </main>
  );
}
