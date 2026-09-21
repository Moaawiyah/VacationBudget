export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading trip" className="space-y-5 p-5 sm:p-8">
      <div className="bg-muted h-10 w-2/3 animate-pulse rounded-xl" />
      <div className="bg-muted h-64 animate-pulse rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-muted h-32 animate-pulse rounded-2xl" />
        ))}
      </div>
    </main>
  );
}
