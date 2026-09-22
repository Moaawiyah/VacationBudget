import { NOTES_MAX_LENGTH } from "@/lib/validation/expense";
import type { Category } from "@/types/category";
import type { ExtractedReceipt, ReceiptLineItem } from "@/types/receipt";

export type ReceiptExpenseDefaults = {
  amount?: number;
  currency?: string;
  category_id?: string;
  description?: string;
  expense_date?: string;
  merchant?: string;
  notes?: string;
};

/** "☕ 2 × Espresso — 5.00", dropping whatever the receipt didn't give us. */
function formatLineItem(item: ReceiptLineItem): string {
  const quantity = item.quantity != null && item.quantity !== 1 ? `${item.quantity} × ` : "";
  const price = item.total_price != null ? ` — ${item.total_price}` : "";
  return `${item.icon} ${quantity}${item.description}${price}`;
}

/** The first `itemCount` items, one per line, noting how many were left out. */
function buildNotes(items: ReceiptLineItem[], itemCount: number): string {
  const lines = items.slice(0, itemCount).map(formatLineItem);
  const omitted = items.length - itemCount;
  if (omitted > 0) lines.push(`…and ${omitted} more`);
  return lines.join("\n");
}

/**
 * The receipt's items, each with its icon, as the expense's notes. The
 * Expense model has no line-item column (see lib/sdk/expense-service.ts), so
 * they ride in the editable notes field the form already has.
 *
 * That field is length-capped, and a long receipt can exceed it — which would
 * make the form reject the very expense it just pre-filled. So items are
 * dropped from the end until the list fits.
 */
function composeNotes(items: ReceiptLineItem[]): string | undefined {
  for (let itemCount = items.length; itemCount > 0; itemCount--) {
    const notes = buildNotes(items, itemCount);
    if (notes.length <= NOTES_MAX_LENGTH) return notes;
  }
  return undefined;
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
    notes: composeNotes(receipt.line_items),
  };
}
