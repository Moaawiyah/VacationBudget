"use client";

import { useState } from "react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { analyzeReceiptResponseSchema } from "@/lib/validation/receipt";
import type { Category } from "@/types/category";
import type { ExtractedReceipt } from "@/types/receipt";
import { ReceiptDropzone } from "./receipt-dropzone";
import { ReceiptPreviewForm } from "./receipt-preview-form";

type AnalyzedReceipt = { file: File; receipt: ExtractedReceipt };

export function ReceiptUploadFlow({
  tripId,
  baseCurrency,
  categories,
}: {
  tripId: string;
  baseCurrency: string;
  categories: Category[];
}) {
  const dict = useDictionary().receipts;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzedReceipt | null>(null);

  async function analyze(file: File) {
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("tripId", tripId);
      form.append("file", file);
      const response = await fetch("/api/receipts/analyze", { method: "POST", body: form });
      const body: unknown = await response.json();

      if (!response.ok) {
        const message =
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : dict.analyzeFailed;
        setError(message);
        return;
      }

      const parsed = analyzeReceiptResponseSchema.safeParse(body);
      if (!parsed.success) {
        setError(dict.analyzeFailed);
        return;
      }
      setResult({ file, receipt: parsed.data.receipt });
    } catch {
      setError(dict.analyzeFailed);
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <ReceiptPreviewForm
        tripId={tripId}
        baseCurrency={baseCurrency}
        categories={categories}
        file={result.file}
        receipt={result.receipt}
        onRetake={() => setResult(null)}
      />
    );
  }

  return <ReceiptDropzone onAnalyze={analyze} pending={pending} error={error} />;
}
