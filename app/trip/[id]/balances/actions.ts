"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { appErrorMessage } from "@/lib/i18n/app-error";

const requestIdSchema = z.string().uuid().optional();

/**
 * Records a real-world payment (0015's record_settlement) — never an
 * expense, and never touches what anything cost. `requestId` protects a
 * double "Mark Paid" tap the same way expense creation does.
 */
export async function markSettlementPaid(
  tripId: string,
  fromUserId: string,
  toUserId: string,
  amount: number,
  requestId?: string,
): Promise<{ error: string } | { ok: true }> {
  const [{ sdk }, dict] = await Promise.all([requireUser(), getDictionary()]);
  const key = requestIdSchema.safeParse(requestId);
  const result = await sdk.settlements.record(
    tripId,
    fromUserId,
    toUserId,
    amount,
    key.success ? key.data : undefined,
  );
  if (result.error) {
    return { error: appErrorMessage(result.code, dict.errors) };
  }
  revalidatePath(`/trip/${tripId}/balances`);
  return { ok: true };
}

export async function deleteSettlement(
  tripId: string,
  settlementId: string,
): Promise<{ error: string } | { ok: true }> {
  const [{ sdk }, dict] = await Promise.all([requireUser(), getDictionary()]);
  const result = await sdk.settlements.remove(settlementId);
  if (result.error) {
    return { error: appErrorMessage(result.code, dict.errors) };
  }
  revalidatePath(`/trip/${tripId}/balances`);
  return { ok: true };
}
