"use client";

import { Download } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";

/** Plain downloads — the export itself is a Route Handler (app/api/account/export). */
export function ExportData() {
  const dict = useDictionary().settings;
  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-3xl border p-6">
      <div>
        <p className="text-foreground font-medium">{dict.exportTitle}</p>
        <p className="text-muted-foreground mt-1 text-sm">{dict.exportDescription}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href="/api/account/export"
          className="border-border text-foreground flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
        >
          <Download aria-hidden className="h-4 w-4 shrink-0" />
          {dict.exportJson}
        </a>
        <a
          href="/api/account/export?format=csv"
          className="border-border text-foreground flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
        >
          <Download aria-hidden className="h-4 w-4 shrink-0" />
          {dict.exportCsv}
        </a>
      </div>
    </div>
  );
}
