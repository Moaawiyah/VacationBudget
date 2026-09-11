"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { createExpenseSchema, type ExpenseInput } from "@/lib/validation/expense";
import { useDictionary } from "@/components/i18n/locale-provider";
import type { Category } from "@/types/category";
import { CategoryPicker } from "@/components/expenses/category-picker";
import { Button } from "@/components/ui/button";
import { AmountCurrencyField, ExchangeRateField } from "./expense-amount-fields";
import { ExpenseDetailFields } from "./expense-detail-fields";
import {
  saveRecentCategory,
  useLiveExchangeRate,
  useRecentCategory,
  type ExpenseFormValues,
} from "./use-expense-form-effects";

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
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormValues, unknown, ExpenseInput>({
    resolver: zodResolver(createExpenseSchema(baseCurrency, dict.validation)),
    defaultValues: {
      expense_date: todayISO(),
      category_id: "",
      currency: baseCurrency,
      ...defaultValues,
    },
  });

  const currency = watch("currency");
  useRecentCategory(
    rememberCategory && !defaultValues?.category_id,
    tripId,
    categories,
    setValue,
  );
  useLiveExchangeRate(currency, baseCurrency, setValue);

  function submit(data: ExpenseInput) {
    setFormError(null);
    if (rememberCategory) saveRecentCategory(tripId, data.category_id);
    startTransition(async () => {
      const result = await onSubmit(data);
      if (result?.error) setFormError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
      <AmountCurrencyField
        register={register}
        amountError={errors.amount?.message}
        currencyError={errors.currency?.message}
      />

      {currency !== baseCurrency && (
        <ExchangeRateField
          register={register}
          currency={currency}
          baseCurrency={baseCurrency}
          amount={watch("amount")}
          exchangeRate={watch("exchange_rate")}
          error={errors.exchange_rate?.message}
        />
      )}

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

      <ExpenseDetailFields register={register} errors={errors} />

      {formError && <p className="text-danger text-sm">{formError}</p>}
      <Button type="submit" loading={isPending} className="gap-2">
        <Check aria-hidden className="h-4 w-4 shrink-0" />
        {submitLabel}
      </Button>
    </form>
  );
}
