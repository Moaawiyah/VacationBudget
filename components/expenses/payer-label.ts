import { companionDisplayName, type Companion } from "@/types/companion";
import { interpolate } from "@/lib/i18n/interpolate";
import type { Dictionary } from "@/lib/i18n/types";

/** userId → display name for everyone on the trip (owner and members). Plain object: crosses to Client Components. */
export function payerNameMap(companions: Companion[]): Record<string, string> {
  return Object.fromEntries(companions.map((c) => [c.userId, companionDisplayName(c)]));
}

/**
 * "Paid by Alex" / "Paid by you" for an expense's payer, or null when the
 * payer isn't a current trip participant (e.g. someone who has since left)
 * — the row then just omits the line rather than showing a raw id.
 */
export function payerLabel(
  paidBy: string,
  currentUserId: string | null,
  names: Record<string, string>,
  dict: Dictionary["expenses"],
): string | null {
  if (paidBy === currentUserId) return dict.paidByYou;
  const name = names[paidBy];
  return name ? interpolate(dict.paidByName, { name }) : null;
}
