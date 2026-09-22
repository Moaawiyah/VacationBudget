"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { appErrorMessage } from "@/lib/i18n/app-error";
import type { Dictionary } from "@/lib/i18n/types";
import type { WriteResult } from "@/lib/sdk/types";
import {
  createExpenseSchema,
  categorySchema,
  type ExpenseInput,
} from "@/lib/validation/expense";
import type { ExpenseScope } from "@/lib/sdk/expense-service";
import type { VacationBudgetSDK } from "@/lib/sdk/sdk";
import type { Category } from "@/types/category";

type ActionResult = { error: string } | never;

type PreparedExpense =
  | { error: string }
  | {
      sdk: VacationBudgetSDK;
      scope: ExpenseScope;
      data: ExpenseInput;
      dict: Dictionary;
    };

/** The client's per-intent idempotency key; anything else is ignored. */
const requestIdSchema = z.string().uuid().optional();

/** An expense write's failure, in the user's language — never a raw DB message. */
function expenseError(result: WriteResult, dict: Dictionary): { error: string } {
  return {
    error: appErrorMessage(result.code, dict.errors, {
      permission_denied: dict.errors.expensePermissionDenied,
    }),
  };
}

/**
 * Shared first half of create/update: the signed-in user's SDK, the trip's
 * base currency (only for a trip they own), and the input validated against it.
 */
async function prepareExpense(
  tripId: string,
  input: ExpenseInput,
): Promise<PreparedExpense> {
  const [{ sdk, user }, dict] = await Promise.all([requireUser(), getDictionary()]);
  const baseCurrency = await sdk.trips.accessibleBaseCurrency(tripId);
  if (!baseCurrency) return { error: dict.trips.tripNotFound };

  const parsed = createExpenseSchema(baseCurrency, dict.validation).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? dict.validation.expenseInvalid };
  }
  return {
    sdk,
    scope: { userId: user.id, tripId, baseCurrency },
    data: parsed.data,
    dict,
  };
}

function revalidateTrip(tripId: string) {
  revalidatePath(`/trip/${tripId}`);
  revalidatePath("/trips");
}

/**
 * `requestId` is generated once per form (see useRequestId) so that a repeat
 * of the same submission — double tap, automatic retry after a dropped
 * connection — resolves to the expense already created instead of a second.
 */
export async function createExpense(
  tripId: string,
  input: ExpenseInput,
  requestId?: string,
): Promise<ActionResult> {
  const prepared = await prepareExpense(tripId, input);
  if ("error" in prepared) return { error: prepared.error };

  const key = requestIdSchema.safeParse(requestId);
  const result = await prepared.sdk.expenses.create(
    prepared.scope,
    prepared.data,
    key.success ? key.data : undefined,
  );
  if (result.error) return expenseError(result, prepared.dict);

  revalidateTrip(tripId);
  redirect(`/trip/${tripId}/expenses?created=1`);
}

export async function updateExpense(
  tripId: string,
  expenseId: string,
  input: ExpenseInput,
): Promise<ActionResult> {
  const prepared = await prepareExpense(tripId, input);
  if ("error" in prepared) return { error: prepared.error };

  const result = await prepared.sdk.expenses.update(
    prepared.scope,
    expenseId,
    prepared.data,
  );
  if (result.error) return expenseError(result, prepared.dict);

  revalidateTrip(tripId);
  redirect(`/trip/${tripId}/expenses`);
}

export async function deleteExpense(
  tripId: string,
  expenseId: string,
): Promise<{ error?: string }> {
  const [{ sdk }, dict] = await Promise.all([requireUser(), getDictionary()]);
  const result = await sdk.expenses.delete(tripId, expenseId);
  if (result.error) return expenseError(result, dict);

  revalidateTrip(tripId);
  return {};
}

export async function createCategory(
  input: unknown,
): Promise<{ error: string } | { category: Category }> {
  const dict = await getDictionary();
  const parsed = categorySchema(dict.validation).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? dict.validation.categoryInvalid };
  }

  const { sdk, user } = await requireUser();
  const result = await sdk.categories.create(user.id, parsed.data.name);
  if ("error" in result) {
    return { error: result.error || dict.expenseForm.categoryCreateFailed };
  }
  return result;
}
