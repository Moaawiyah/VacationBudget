"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { createExpenseSchema, type ExpenseInput } from "@/lib/validation/expense";
import { useDictionary } from "@/components/i18n/locale-provider";
import type { Category } from "@/types/category";
import { CategoryPicker } from "@/components/expenses/category-picker";
import { Button } from "@/components/ui/button";
import type { Companion } from "@/types/companion";
import { AmountCurrencyField, ExchangeRateField } from "./expense-amount-fields";
import { ExpenseDetailFields } from "./expense-detail-fields";
import { SplitFields } from "./split-fields";
import {
  markRateManualOnEdit,
  saveRecentCategory,
  useLiveExchangeRate,
  useRecentCategory,
  type ExpenseFormValues,
} from "./use-expense-form-effects";
import { useSplitFields, type SplitFieldsState } from "./use-split-fields";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type ExpenseFormProps = {
  tripId: string;
  baseCurrency: string;
  categories: Category[];
  currentUserId: string;
  companions: Companion[];
  defaultValues?: Partial<ExpenseFormValues>;
  onSubmit: (input: ExpenseInput) => Promise<{ error: string } | void>;
  submitLabel: string;
  /** Only remember the picked category for next time on the "new expense" form. */
  rememberCategory?: boolean;
  /** Calls out the category picker while it's empty — see CategoryPicker. */
  highlightCategory?: boolean;
  /** A split computed elsewhere (receipt item assignment) to adopt — see ReceiptItemSplit. */
  pendingSplit?: { token: number; paidBy: string; amounts: Record<string, number> } | null;
  /** Hides the built-in "split with others" UI — the caller is showing its own (item splitting). */
  hideSplitFields?: boolean;
  /** Editing: the expense's saved payer and split, so saving keeps them unless changed. */
  initialSplit?: SplitFieldsState;
};

export function ExpenseForm({
  tripId,
  baseCurrency,
  categories,
  currentUserId,
  companions,
  defaultValues,
  onSubmit,
  submitLabel,
  rememberCategory = false,
  highlightCategory = false,
  pendingSplit,
  hideSplitFields = false,
  initialSplit,
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
  const amount = watch("amount");
  useRecentCategory(
    rememberCategory && !defaultValues?.category_id,
    tripId,
    categories,
    setValue,
  );
  useLiveExchangeRate(currency, baseCurrency, setValue);
  const split = useSplitFields(currentUserId, Number(amount) || undefined, currency, initialSplit);
  useEffect(() => {
    if (pendingSplit) split.applyComputedSplit(pendingSplit.paidBy, pendingSplit.amounts);
    // Re-apply only when a *new* computation arrives (token), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSplit?.token]);

  function submit(data: ExpenseInput) {
    setFormError(null);
    if (split.state.enabled && !split.result?.ok) {
      setFormError(dict.expenseForm.splitInvalid_generic);
      return;
    }
    if (rememberCategory) saveRecentCategory(tripId, data.category_id);
    const finalData: ExpenseInput = {
      ...data,
      paid_by: split.state.paidBy,
      split_method: split.state.enabled ? split.state.method : "equal",
      splits:
        split.state.enabled && split.result?.ok
          ? split.result.shares.map((s) => ({
              user_id: s.userId,
              share_amount: s.shareAmount,
              share_percent: s.sharePercent,
            }))
          : undefined,
    };
    startTransition(async () => {
      const result = await onSubmit(finalData);
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
          onManualEdit={() => markRateManualOnEdit(setValue)}
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
            highlightWhenEmpty={highlightCategory}
          />
        )}
      />

      {!hideSplitFields && companions.length > 1 && (
        <SplitFields split={split} companions={companions} currency={currency} />
      )}

      <ExpenseDetailFields register={register} errors={errors} />

      {formError && <p className="text-danger text-sm">{formError}</p>}
      <Button type="submit" loading={isPending} className="gap-2">
        <Check aria-hidden className="h-4 w-4 shrink-0" />
        {submitLabel}
      </Button>
    </form>
  );
}
