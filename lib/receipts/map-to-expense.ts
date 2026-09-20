import type { Category } from "@/types/category";
import type { ExtractedReceipt } from "@/types/receipt";

export type ReceiptExpenseDefaults = {
  amount?: number;
  currency?: string;
  category_id?: string;
  description?: string;
  expense_date?: string;
  merchant?: string;
  notes?: string;
};

/**
 * The Expense model has no tax/line-item columns of its own (see
 * lib/sdk/expense-service.ts) — rather than extending it for this one
 * feature, that detail is folded into the (editable) notes field the
 * existing expense form already has.
 */
function composeNotes(receipt: ExtractedReceipt): string | undefined {
  const parts: string[] = [];

  if (receipt.subtotal != null) parts.push(`Subtotal: ${receipt.subtotal}`);
  if (receipt.tax != null) parts.push(`Tax/VAT: ${receipt.tax}`);

  if (receipt.line_items.length > 0) {
    const items = receipt.line_items
      .map((item) => {
        const price = item.total_price != null ? ` (${item.total_price})` : "";
        return `- ${item.description}${price}`;
      })
      .join("\n");
    parts.push(`Line items:\n${items}`);
  }

  if (receipt.detected_language && receipt.detected_language !== "en" && receipt.translation) {
    parts.push(`Translation: ${receipt.translation}`);
  }

  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

/**
 * Resolves the suggested category name back to one of the user's own
 * categories. receipt-service already rejects anything outside the list it
 * was given, so this is a lookup rather than a second trust decision — but
 * it still returns undefined on a miss, leaving the field for the user.
 */
function resolveCategoryId(
  suggested: string | null,
  categories: Category[],
): string | undefined {
  if (!suggested) return undefined;
  const needle = suggested.trim().toLowerCase();
  return categories.find((c) => c.name.trim().toLowerCase() === needle)?.id;
}

/**
 * Best-effort mapping from a receipt extraction to the existing expense
 * form's fields. Every field here is a pre-fill the user can still edit
 * before anything is saved.
 */
export function mapReceiptToExpenseDefaults(
  receipt: ExtractedReceipt,
  baseCurrency: string,
  categories: Category[] = [],
): ReceiptExpenseDefaults {
  const merchant = receipt.merchant?.trim() || undefined;
  return {
    amount: receipt.total ?? undefined,
    currency: receipt.currency ?? baseCurrency,
    category_id: resolveCategoryId(receipt.category, categories),
    description: merchant,
    expense_date: receipt.expense_date ?? undefined,
    merchant,
    notes: composeNotes(receipt),
  };
}
