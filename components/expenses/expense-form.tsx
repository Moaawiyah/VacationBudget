"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { expenseSchema, type ExpenseInput } from "@/lib/validation/expense";
import type { Category } from "@/types/category";
import { CategoryPicker } from "@/components/expenses/category-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type ExpenseFormValues = z.input<typeof expenseSchema>;

const recentCategoryKey = (tripId: string) => `vacation-budget:recent-category:${tripId}`;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type ExpenseFormProps = {
  tripId: string;
  baseCurrency: string;
  categories: Category[];
  defaultValues?: Partial<ExpenseFormValues>;
  onSubmit: (input: ExpenseInput) => Promise<{ error: string } | void>;
  submitLabel: string;
  /** Only remember the picked category for next time on the "new expense" form. */
  rememberCategory?: boolean;
};

export function ExpenseForm({
  tripId,
  baseCurrency,
  categories,
  defaultValues,
  onSubmit,
  submitLabel,
  rememberCategory = false,
}: ExpenseFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormValues, unknown, ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_date: todayISO(),
      category_id: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (!rememberCategory || defaultValues?.category_id) return;
    const remembered = window.localStorage.getItem(recentCategoryKey(tripId));
    if (remembered && categories.some((c) => c.id === remembered)) {
      setValue("category_id", remembered);
    }
    // Only on mount — this is a one-time default, not a live sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(data: ExpenseInput) {
    setFormError(null);
    if (rememberCategory) {
      window.localStorage.setItem(recentCategoryKey(tripId), data.category_id);
    }
    startTransition(async () => {
      const result = await onSubmit(data);
      if (result?.error) setFormError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-1 py-4">
        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground text-2xl font-medium">
            {baseCurrency}
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            autoFocus
            className="text-foreground w-40 border-none bg-transparent text-center text-5xl font-semibold outline-none"
            {...register("amount")}
          />
        </div>
        {errors.amount && <p className="text-danger text-sm">{errors.amount.message}</p>}
      </div>

      <Controller
        name="category_id"
        control={control}
        render={({ field }) => (
          <CategoryPicker
            categories={categories}
            value={field.value}
            onChange={field.onChange}
            error={errors.category_id?.message}
          />
        )}
      />

      <Input
        label="Description"
        placeholder="Dinner, hotel, taxi…"
        error={errors.description?.message}
        {...register("description")}
      />
      <Input
        label="Date"
        type="date"
        error={errors.expense_date?.message}
        {...register("expense_date")}
      />
      <Input
        label="Merchant (optional)"
        error={errors.merchant?.message}
        {...register("merchant")}
      />
      <Input
        label="Location (optional)"
        error={errors.location?.message}
        {...register("location")}
      />
      <Textarea
        label="Notes (optional)"
        error={errors.notes?.message}
        {...register("notes")}
      />

      {formError && <p className="text-danger text-sm">{formError}</p>}
      <Button type="submit" loading={isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}
