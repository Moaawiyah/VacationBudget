"use client";

import { useDictionary } from "@/components/i18n/locale-provider";

export default function TripError({ reset }: { reset: () => void }) {
  const copy = useDictionary().travel;
  return (
    <main
      className="border-border bg-card m-5 flex flex-col items-center gap-4 rounded-2xl border p-8 text-center"
      role="alert"
    >
      <h1 className="text-xl font-semibold">{copy.loadError}</h1>
      <p className="text-muted-foreground text-sm">{copy.tryLater}</p>
      <button
        onClick={reset}
        className="bg-primary text-primary-foreground rounded-full px-5 py-3"
      >
        {copy.retry}
      </button>
    </main>
  );
}
