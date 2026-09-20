"use client";

import { useEffect, useMemo } from "react";
import { AlertTriangle, Languages, Receipt as ReceiptIcon } from "lucide-react";
import { createExpense } from "@/app/trip/[id]/expenses/actions";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { useDictionary } from "@/components/i18n/locale-provider";
import { mapReceiptToExpenseDefaults } from "@/lib/receipts/map-to-expense";
import type { Category } from "@/types/category";
import type { ExtractedReceipt } from "@/types/receipt";
import { Button } from "@/components/ui/button";

/**
 * The editable review step: shows what the pipeline extracted (warnings,
 * translation, line items, tax) alongside the *same* ExpenseForm used for
 * manual entry, pre-filled from the extraction. Nothing here writes an
 * expense directly — submitting still goes through the existing
 * createExpense action, so this is a new entry point, not a new write path.
 */
export function ReceiptPreviewForm({
  tripId,
  baseCurrency,
  categories,
  file,
  receipt,
  onRetake,
}: {
  tripId: string;
  baseCurrency: string;
  categories: Category[];
  file: File;
  receipt: ExtractedReceipt;
  onRetake: () => void;
}) {
  const dict = useDictionary().receipts;
  // Deriving the URL during render (not via setState in an effect) avoids an
  // extra render; only the revocation needs to run as an effect.
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  const defaults = useMemo(
    () => mapReceiptToExpenseDefaults(receipt, baseCurrency, categories),
    [receipt, baseCurrency, categories],
  );
  const showTranslation =
    receipt.detected_language && receipt.detected_language !== "en" && receipt.translation;

  return (
    <div className="flex flex-col gap-5">
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- client-side object URL, not an optimizable remote asset
        <img
          src={previewUrl}
          alt={dict.receiptPreviewAlt}
          className="border-border max-h-64 w-full rounded-2xl border object-contain"
        />
      )}

      {receipt.warnings.length > 0 && (
        <div className="border-danger bg-danger/10 flex flex-col gap-1 rounded-2xl border p-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle aria-hidden className="h-4 w-4 shrink-0" />
            {dict.reviewNeeded}
          </p>
          <ul className="list-inside list-disc">
            {receipt.warnings.map((warning, index) => (
              <li key={index}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}

      {showTranslation && (
        <div className="text-muted-foreground flex flex-col gap-1 text-sm">
          <p className="text-foreground flex items-center gap-1.5 font-medium">
            <Languages aria-hidden className="h-4 w-4 shrink-0" />
            {dict.detectedLanguage}: {receipt.detected_language?.toUpperCase()}
          </p>
          <p>{receipt.translation}</p>
        </div>
      )}

      {receipt.line_items.length > 0 && (
        <div className="border-border bg-card flex flex-col gap-2 rounded-2xl border p-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium">
            <ReceiptIcon aria-hidden className="h-4 w-4 shrink-0" />
            {dict.lineItems}
          </p>
          {receipt.line_items.map((item, index) => (
            <div key={index} className="text-muted-foreground flex justify-between gap-2">
              <span className="truncate">{item.description}</span>
              {item.total_price != null && <span>{item.total_price}</span>}
            </div>
          ))}
          {receipt.tax != null && (
            <div className="border-border text-foreground flex justify-between border-t pt-2 font-medium">
              <span>{dict.tax}</span>
              <span>{receipt.tax}</span>
            </div>
          )}
        </div>
      )}

      <Button type="button" variant="secondary" onClick={onRetake}>
        {dict.retake}
      </Button>

      <ExpenseForm
        tripId={tripId}
        baseCurrency={baseCurrency}
        categories={categories}
        defaultValues={defaults}
        onSubmit={(data) => createExpense(tripId, data)}
        submitLabel={dict.createExpense}
        highlightCategory
      />
    </div>
  );
}
