export default function Home() {
  return (
    <main className="safe-top safe-x safe-bottom flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="border-border bg-card w-full max-w-sm rounded-3xl border p-8 text-center shadow-sm">
        <div className="bg-primary mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl">
          ✈️
        </div>
        <h1 className="text-card-foreground text-xl font-semibold">Vacation Budget</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Plan and track your vacation spending across cities and currencies.
        </p>
      </div>
      <p className="text-muted-foreground text-xs">Project foundation running ✓</p>
    </main>
  );
}
