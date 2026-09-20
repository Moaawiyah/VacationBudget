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

/** The notes body with only the first `itemCount` items, noting any omitted. */
function buildNotes(receipt: ExtractedReceipt, itemCount: number): string {
  const parts: string[] = [];

  if (receipt.subtotal != null) parts.push(`Subtotal: ${receipt.subtotal}`);
  if (receipt.tax != null) parts.push(`Tax/VAT: ${receipt.tax}`);

  if (itemCount > 0) {
    const lines = receipt.line_items.slice(0, itemCount).map(formatLineItem);
    const omitted = receipt.line_items.length - itemCount;
    if (omitted > 0) lines.push(`…and ${omitted} more`);
    parts.push(`Items:\n${lines.join("\n")}`);
  }

  if (receipt.detected_language && receipt.detected_language !== "en" && receipt.translation) {
    parts.push(`Translation: ${receipt.translation}`);
  }

  return parts.join("\n\n");
}

/**
 * The Expense model has no tax/line-item columns of its own (see
 * lib/sdk/expense-service.ts) — rather than extending it for this one
 * feature, that detail is folded into the (editable) notes field the
 * existing expense form already has.
 *
 * That field is length-capped, and a long receipt's items plus a translation
 * can exceed it — which would make the form reject the very expense it just
 * pre-filled. So items are dropped from the end until the body fits.
 */
function composeNotes(receipt: ExtractedReceipt): string | undefined {
  for (let itemCount = receipt.line_items.length; itemCount >= 0; itemCount--) {
    const notes = buildNotes(receipt, itemCount);
    if (notes.length <= NOTES_MAX_LENGTH) return notes || undefined;
  }
  // Doesn't fit even with no items — a very long translation. Keep the head
  // of it rather than throwing away the subtotal/tax detail as well.
  return buildNotes(receipt, 0).slice(0, NOTES_MAX_LENGTH);
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
