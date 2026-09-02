function CardSkeleton() {
  return (
    <div className="border-border bg-card h-44 animate-pulse rounded-3xl border p-5">
      <div className="bg-muted h-5 w-2/3 rounded-lg" />
      <div className="bg-muted mt-3 h-4 w-1/2 rounded-lg" />
      <div className="bg-muted mt-2 h-4 w-1/3 rounded-lg" />
      <div className="bg-muted mt-6 h-2 w-full rounded-full" />
    </div>
  );
}

export default function TripsLoading() {
  return (
    <main className="safe-top safe-x safe-bottom flex flex-1 flex-col gap-6 p-6">
      <div className="bg-muted h-8 w-32 animate-pulse rounded-lg" />
      <div className="bg-muted h-12 w-full animate-pulse rounded-2xl" />
      <div className="flex flex-col gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </main>
  );
}
