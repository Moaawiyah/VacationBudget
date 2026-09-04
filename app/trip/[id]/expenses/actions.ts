"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import {
  createExpenseSchema,
  categorySchema,
  type ExpenseInput,
} from "@/lib/validation/expense";
import { convertCurrency } from "@/lib/currency/convert";
import { CUSTOM_CATEGORY_ICON } from "@/lib/icons";
import type { Category } from "@/types/category";

type ActionResult = { error: string } | never;

export async function createExpense(
  tripId: string,
  input: ExpenseInput,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const dict = await getDictionary();

  const { data: trip } = await supabase
    .from("trips")
    .select("base_currency")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .single();

  if (!trip) {
    return { error: dict.trips.tripNotFound };
  }

  const parsed = createExpenseSchema(trip.base_currency, dict.validation).safeParse(
    input,
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? dict.validation.expenseInvalid };
  }

  // Same-currency expenses always convert at 1 — never trust a client-sent
  // rate for that case. converted_amount is never trusted from the client
  // at all; it's always derived here from the validated amount + rate.
  // (exchange_rate is guaranteed present by createExpenseSchema's refine
  // whenever currency !== base_currency, so no further fallback is needed.)
  const exchangeRate =
    parsed.data.currency === trip.base_currency ? 1 : parsed.data.exchange_rate!;

  const { error } = await supabase.from("expenses").insert({
    trip_id: tripId,
    user_id: user.id,
    category_id: parsed.data.category_id,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    exchange_rate: exchangeRate,
    converted_amount: convertCurrency(parsed.data.amount, exchangeRate),
    description: parsed.data.description,
    expense_date: parsed.data.expense_date,
    merchant: parsed.data.merchant || null,
    location: parsed.data.location || null,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/trip/${tripId}`);
  revalidatePath("/trips");
  redirect(`/trip/${tripId}/expenses?created=1`);
}

export async function updateExpense(
  tripId: string,
  expenseId: string,
  input: ExpenseInput,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const dict = await getDictionary();

  const { data: trip } = await supabase
    .from("trips")
    .select("base_currency")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .single();

  if (!trip) {
    return { error: dict.trips.tripNotFound };
  }

  const parsed = createExpenseSchema(trip.base_currency, dict.validation).safeParse(
    input,
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? dict.validation.expenseInvalid };
  }

  const exchangeRate =
    parsed.data.currency === trip.base_currency ? 1 : parsed.data.exchange_rate!;

  const { error } = await supabase
    .from("expenses")
    .update({
      category_id: parsed.data.category_id,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      exchange_rate: exchangeRate,
      converted_amount: convertCurrency(parsed.data.amount, exchangeRate),
      description: parsed.data.description,
      expense_date: parsed.data.expense_date,
      merchant: parsed.data.merchant || null,
      location: parsed.data.location || null,
      notes: parsed.data.notes || null,
    })
    // Scoped by trip_id too, not just id + user_id — otherwise a stale/
    // tampered URL pairing this trip's id with another of the user's own
    // expenses would silently reprice that expense using *this* trip's
    // base_currency while leaving it attached to its real trip.
    .eq("id", expenseId)
    .eq("trip_id", tripId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/trip/${tripId}`);
  revalidatePath("/trips");
  redirect(`/trip/${tripId}/expenses`);
}

export async function deleteExpense(
  tripId: string,
  expenseId: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("trip_id", tripId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/trip/${tripId}`);
  revalidatePath("/trips");
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

  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name: parsed.data.name, icon: CUSTOM_CATEGORY_ICON })
    .select()
    .single();

  if (error || !data) {
    return { error: error?.message ?? dict.expenseForm.categoryCreateFailed };
  }

  return { category: data };
}
