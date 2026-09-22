"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Languages, Receipt as ReceiptIcon } from "lucide-react";
import { createExpense } from "@/app/trip/[id]/expenses/actions";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Chip, ChipRow } from "@/components/expenses/split-chip";
import { useRequestId } from "@/components/expenses/use-request-id";
import { useDictionary } from "@/components/i18n/locale-provider";
import { mapReceiptToExpenseDefaults } from "@/lib/receipts/map-to-expense";
import { warningMessages } from "@/lib/receipts/receipt-warnings";
import type { Category } from "@/types/category";
import type { Companion } from "@/types/companion";
import type { ExtractedReceipt } from "@/types/receipt";
import { Button } from "@/components/ui/button";
import { ReceiptItemSplit } from "./receipt-item-split";

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
  currentUserId,
  companions,
  file,
  receipt,
  onRetake,
}: {
  tripId: string;
  baseCurrency: string;
  categories: Category[];
  currentUserId: string;
  companions: Companion[];
  file: File;
  receipt: ExtractedReceipt;
  onRetake: () => void;
}) {
  const copy = useDictionary();
  const dict = copy.receipts;
  const t = copy.expenseForm;
  // One key per scanned receipt: confirming it twice creates one expense.
  const requestId = useRequestId();
  const [splitMode, setSplitMode] = useState<"whole" | "items">("whole");
  const [pendingSplit, setPendingSplit] = useState<
    { token: number; paidBy: string; amounts: Record<string, number> } | null
  >(null);
  const itemizable = companions.length > 1 && receipt.line_items.some((i) => i.total_price != null);
  // Deriving the URL during render (not via setState in an effect) avoids an
  // extra render; only the revocation needs to run as an effect.
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  const defaults = useMemo(
    () => mapReceiptToExpenseDefaults(receipt, baseCurrency, categories),
    [receipt, baseCurrency, categories],
  );
  const showTranslation =
    receipt.detected_language &&
    receipt.detected_language !== "en" &&
    receipt.translation;

  return (
    <div className="flex flex-col gap-5">
      <div className="panel flex flex-wrap justify-between gap-3 text-sm">
        <span>
          {dict.detectedLanguage}: {receipt.detected_language?.toUpperCase() ?? "—"}
        </span>
        <span>
          {copy.travel.confidence}: {Math.round(receipt.confidence * 100)}%
        </span>
      </div>
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
            {warningMessages(receipt.warnings, dict.warnings).map((message) => (
              <li key={message}>{message}</li>
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

      {(receipt.line_items.length > 0 || receipt.tax != null) && (
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

      {itemizable && (
        <ChipRow>
          <Chip selected={splitMode === "whole"} onClick={() => setSplitMode("whole")}>
            {t.splitWholeReceipt}
          </Chip>
          <Chip selected={splitMode === "items"} onClick={() => setSplitMode("items")}>
            {t.splitByItems}
          </Chip>
        </ChipRow>
      )}
      {itemizable && splitMode === "items" && (
        <ReceiptItemSplit
          companions={companions}
          currentUserId={currentUserId}
          amount={defaults.amount ?? receipt.total ?? 0}
          currency={defaults.currency ?? baseCurrency}
          items={receipt.line_items}
          onApply={(paidBy, amounts) =>
            setPendingSplit({ token: Date.now(), paidBy, amounts })
          }
        />
      )}

      <ExpenseForm
        tripId={tripId}
        baseCurrency={baseCurrency}
        categories={categories}
        currentUserId={currentUserId}
        companions={companions}
        defaultValues={defaults}
        onSubmit={(data) => createExpense(tripId, data, requestId)}
        submitLabel={dict.createExpense}
        highlightCategory
        pendingSplit={pendingSplit}
        hideSplitFields={itemizable && splitMode === "items"}
      />
    </div>
  );
}
