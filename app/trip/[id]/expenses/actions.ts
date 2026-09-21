"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
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
  { error: string } | { sdk: VacationBudgetSDK; scope: ExpenseScope; data: ExpenseInput };

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
  return { sdk, scope: { userId: user.id, tripId, baseCurrency }, data: parsed.data };
}

function revalidateTrip(tripId: string) {
  revalidatePath(`/trip/${tripId}`);
  revalidatePath("/trips");
}

export async function createExpense(
  tripId: string,
  input: ExpenseInput,
): Promise<ActionResult> {
  const prepared = await prepareExpense(tripId, input);
  if ("error" in prepared) return { error: prepared.error };

  const { error } = await prepared.sdk.expenses.create(prepared.scope, prepared.data);
  if (error) return { error };

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

  const { error } = await prepared.sdk.expenses.update(
    prepared.scope,
    expenseId,
    prepared.data,
  );
  if (error) return { error };

  revalidateTrip(tripId);
  redirect(`/trip/${tripId}/expenses`);
}

export async function deleteExpense(
  tripId: string,
  expenseId: string,
): Promise<{ error?: string }> {
  const { sdk, user } = await requireUser();
  const result = await sdk.expenses.delete(user.id, tripId, expenseId);
  if (result.error) return result;

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
