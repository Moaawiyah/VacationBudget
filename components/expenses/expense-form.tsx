"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  ArrowRightLeft,
  Calendar,
  Check,
  MapPin,
  PenLine,
  StickyNote,
  Store,
} from "lucide-react";
import {
  expenseFields,
  createExpenseSchema,
  type ExpenseInput,
} from "@/lib/validation/expense";
import { CURRENCIES } from "@/lib/currency/constants";
import { fetchExchangeRate } from "@/lib/currency/exchange-rate";
import { convertCurrency } from "@/lib/currency/convert";
import { formatCurrency } from "@/lib/currency/format";
import { useDictionary, useLocale } from "@/components/i18n/locale-provider";
import { interpolate } from "@/lib/i18n/interpolate";
import type { Category } from "@/types/category";
import { CategoryPicker } from "@/components/expenses/category-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type ExpenseFormValues = z.input<ReturnType<typeof expenseFields>>;

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
  const dict = useDictionary();
  const { bcp47 } = useLocale();
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
  const exchangeRate = watch("exchange_rate");
  const isForeignCurrency = currency !== baseCurrency;

  useEffect(() => {
    if (!rememberCategory || defaultValues?.category_id) return;
    const remembered = window.localStorage.getItem(recentCategoryKey(tripId));
    if (remembered && categories.some((c) => c.id === remembered)) {
      setValue("category_id", remembered);
    }
    // Only on mount — this is a one-time default, not a live sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Try a live rate whenever the currency changes. fetchExchangeRate()
  // returns null until a real provider is wired up (see its own comment),
  // so today this only ever pre-fills the trivial same-currency case — the
  // user always enters foreign-currency rates manually. That's the whole
  // point of building it as a hook here: nothing else needs to change later.
  useEffect(() => {
    if (!currency) return;
    if (currency === baseCurrency) {
      setValue("exchange_rate", undefined);
      return;
    }
    let cancelled = false;
    fetchExchangeRate(currency, baseCurrency).then((rate) => {
      if (!cancelled && rate !== null) setValue("exchange_rate", rate);
    });
    return () => {
      cancelled = true;
    };
  }, [currency, baseCurrency, setValue]);

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

  const previewAmount =
    isForeignCurrency && amount && exchangeRate
      ? convertCurrency(Number(amount), Number(exchangeRate))
      : null;
  const t = dict.expenseForm;

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-1 py-4">
        <div className="flex items-baseline gap-2">
          <select
            {...register("currency")}
            className="text-muted-foreground rounded-lg border-none bg-transparent text-2xl font-medium outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
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
        {errors.currency && (
          <p className="text-danger text-sm">{errors.currency.message}</p>
        )}
      </div>

      {isForeignCurrency && (
        <div className="flex flex-col gap-1.5">
          <Input
            label={interpolate(t.exchangeRateLabel, { currency, base: baseCurrency })}
            icon={ArrowRightLeft}
            type="number"
            inputMode="decimal"
            step="0.0001"
            min="0"
            placeholder="1.00"
            error={errors.exchange_rate?.message}
            {...register("exchange_rate")}
          />
          {previewAmount !== null && (
            <p className="text-muted-foreground text-xs">
              ≈ {formatCurrency(previewAmount, baseCurrency, bcp47)}
            </p>
          )}
        </div>
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

      <Input
        label={t.description}
        icon={PenLine}
        placeholder={t.descriptionPlaceholder}
        error={errors.description?.message}
        {...register("description")}
      />
      <Input
        label={t.date}
        icon={Calendar}
        type="date"
        error={errors.expense_date?.message}
        {...register("expense_date")}
      />
      <Input
        label={t.merchantOptional}
        icon={Store}
        error={errors.merchant?.message}
        {...register("merchant")}
      />
      <Input
        label={t.locationOptional}
        icon={MapPin}
        error={errors.location?.message}
        {...register("location")}
      />
      <Textarea
        label={t.notesOptional}
        icon={StickyNote}
        error={errors.notes?.message}
        {...register("notes")}
      />

      {formError && <p className="text-danger text-sm">{formError}</p>}
      <Button type="submit" loading={isPending} className="gap-2">
        <Check aria-hidden className="h-4 w-4 shrink-0" />
        {submitLabel}
      </Button>
    </form>
  );
}
