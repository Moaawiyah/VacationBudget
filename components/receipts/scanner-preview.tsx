"use client";

import { useEffect, useMemo } from "react";
import { ScanLine, LoaderCircle, Receipt } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { useReceiptStage } from "./use-receipt-stage";

export function ReceiptScanner({
  file,
  pending,
}: {
  file: File | null;
  pending: boolean;
}) {
  const copy = useDictionary();
  const dict = copy.receipts;
  const stage = useReceiptStage(pending);
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return (
    <div
      className="relative flex min-h-80 items-center justify-center overflow-hidden rounded-2xl bg-[#10232e] p-10 text-white"
      aria-busy={pending}
    >
      <div className="absolute inset-5 rounded-xl border border-white/10" />
      <div className="relative flex min-h-60 w-full max-w-64 items-center justify-center rounded-lg border-2 border-teal-300/80 p-4">
        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img
              src={url}
              alt={dict.receiptPreviewAlt}
              className="max-h-64 w-full rounded object-contain"
            />
          </>
        ) : (
          <Receipt aria-hidden className="size-20 text-white/25" />
        )}
        {pending && (
          <div className="absolute inset-x-0 top-1/2 h-0.5 animate-pulse bg-teal-300 shadow-[0_0_20px_#5eead4]" />
        )}
      </div>
      <div
        role="status"
        className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 text-xs"
      >
        {pending ? (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        ) : (
          <ScanLine aria-hidden className="size-4" />
        )}
        {pending ? dict[stage] : file ? file.name : copy.travel.alignReceipt}
      </div>
    </div>
  );
}
