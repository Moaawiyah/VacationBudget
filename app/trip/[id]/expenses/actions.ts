"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  expenseSchema,
  categorySchema,
  type ExpenseInput,
} from "@/lib/validation/expense";
import { convertCurrency } from "@/lib/currency/convert";
import { CUSTOM_CATEGORY_ICON } from "@/lib/icons";
import type { Category } from "@/types/category";

type ActionResult = { error: string } | never;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createExpense(
  tripId: string,
  input: ExpenseInput,
): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid expense." };
  }

  const { supabase, user } = await requireUser();

  // Phase 3: expense currency always matches the trip's base currency, so the
  // rate is always 1. Phase 6 replaces this with a real currency picker +
  // manual rate — convertCurrency() itself won't need to change.
  const { data: trip } = await supabase
    .from("trips")
    .select("base_currency")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .single();

  if (!trip) {
    return { error: "Trip not found." };
  }

  const exchangeRate = 1;
  const { error } = await supabase.from("expenses").insert({
    trip_id: tripId,
    user_id: user.id,
    category_id: parsed.data.category_id,
    amount: parsed.data.amount,
    currency: trip.base_currency,
    converted_amount: convertCurrency(parsed.data.amount, exchangeRate),
    exchange_rate: exchangeRate,
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
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid expense." };
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("expenses")
    .update({
      category_id: parsed.data.category_id,
      amount: parsed.data.amount,
      converted_amount: convertCurrency(parsed.data.amount, 1),
      description: parsed.data.description,
      expense_date: parsed.data.expense_date,
      merchant: parsed.data.merchant || null,
      location: parsed.data.location || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", expenseId)
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
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid category name." };
  }

  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name: parsed.data.name, icon: CUSTOM_CATEGORY_ICON })
    .select()
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create category." };
  }

  return { category: data };
}
