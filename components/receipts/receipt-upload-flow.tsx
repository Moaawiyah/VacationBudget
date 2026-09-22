"use client";

import Link from "next/link";
import { useState } from "react";
import { PenLine, RotateCcw } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import {
  isRetryable,
  receiptErrorCode,
  receiptErrorMessage,
  type ReceiptErrorCode,
} from "@/lib/receipts/receipt-errors";
import { analyzeReceiptResponseSchema } from "@/lib/validation/receipt";
import type { Category } from "@/types/category";
import type { Companion } from "@/types/companion";
import type { ExtractedReceipt } from "@/types/receipt";
import { ReceiptDropzone } from "./receipt-dropzone";
import { ReceiptPreviewForm } from "./receipt-preview-form";

type AnalyzedReceipt = { file: File; receipt: ExtractedReceipt };
type Failure = { code: ReceiptErrorCode; file: File };

/** Posts the image; resolves to the extraction or a coded failure. */
async function requestAnalysis(
  tripId: string,
  file: File,
): Promise<{ receipt: ExtractedReceipt } | { code: ReceiptErrorCode }> {
  const form = new FormData();
  form.append("tripId", tripId);
  form.append("file", file);
  try {
    const response = await fetch("/api/receipts/analyze", { method: "POST", body: form });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) return { code: receiptErrorCode(response.status, body) };
    const parsed = analyzeReceiptResponseSchema.safeParse(body);
    return parsed.success ? { receipt: parsed.data.receipt } : { code: "unknown" };
  } catch {
    return { code: "analysis_unavailable" }; // offline, or the connection dropped
  }
}

export function ReceiptUploadFlow({
  tripId,
  baseCurrency,
  categories,
  currentUserId,
  companions,
}: {
  tripId: string;
  baseCurrency: string;
  categories: Category[];
  currentUserId: string;
  companions: Companion[];
}) {
  const dict = useDictionary();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [result, setResult] = useState<AnalyzedReceipt | null>(null);

  async function analyze(file: File) {
    if (pending) return; // one analysis at a time: each is a paid LLM call
    setPending(true);
    setFailure(null);
    const outcome = await requestAnalysis(tripId, file);
    setPending(false);
    if ("code" in outcome) setFailure({ code: outcome.code, file });
    else setResult({ file, receipt: outcome.receipt });
  }

  if (result) {
    return (
      <ReceiptPreviewForm
        tripId={tripId}
        baseCurrency={baseCurrency}
        categories={categories}
        currentUserId={currentUserId}
        companions={companions}
        file={result.file}
        receipt={result.receipt}
        onRetake={() => setResult(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ReceiptDropzone
        onAnalyze={analyze}
        pending={pending}
        error={failure ? receiptErrorMessage(failure.code, dict.errors) : null}
      />
      {failure && !pending && (
        <div className="flex flex-col gap-2">
          {isRetryable(failure.code) && (
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={() => analyze(failure.file)}
            >
              <RotateCcw aria-hidden className="h-4 w-4 shrink-0" />
              {dict.receipts.tryAgain}
            </Button>
          )}
          <Link
            href={`/trip/${tripId}/expenses/new`}
            className="text-primary flex items-center justify-center gap-2 py-2 text-sm font-medium"
          >
            <PenLine aria-hidden className="h-4 w-4 shrink-0" />
            {dict.receipts.enterManually}
          </Link>
        </div>
      )}
    </div>
  );
}
