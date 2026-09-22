"use client";

import type { UseFormRegister } from "react-hook-form";
import { ArrowRightLeft } from "lucide-react";
import { CURRENCIES } from "@/lib/currency/constants";
import { convertCurrency } from "@/lib/currency/convert";
import { formatCurrency } from "@/lib/currency/format";
import { interpolate } from "@/lib/i18n/interpolate";
import { useDictionary, useLocale } from "@/components/i18n/locale-provider";
import { Input } from "@/components/ui/input";
import type { ExpenseFormValues } from "./use-expense-form-effects";

type Register = UseFormRegister<ExpenseFormValues>;

/** The big centred "EUR 0.00" amount entry at the top of the expense form. */
export function AmountCurrencyField({
  register,
  amountError,
  currencyError,
}: {
  register: Register;
  amountError?: string;
  currencyError?: string;
}) {
  return (
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
      {amountError && <p className="text-danger text-sm">{amountError}</p>}
      {currencyError && <p className="text-danger text-sm">{currencyError}</p>}
    </div>
  );
}

/**
 * Manual exchange-rate entry, with a live "≈ converted" preview. May arrive
 * pre-filled from a live lookup (use-expense-form-effects); `onManualEdit`
 * marks the rate as manually entered the moment the person changes it —
 * their own number is exactly as valid, just labeled differently.
 */
export function ExchangeRateField({
  register,
  currency,
  baseCurrency,
  amount,
  exchangeRate,
  error,
  onManualEdit,
}: {
  register: Register;
  currency: string;
  baseCurrency: string;
  amount: unknown;
  exchangeRate: unknown;
  error?: string;
  onManualEdit?: () => void;
}) {
  const dict = useDictionary();
  const { bcp47 } = useLocale();
  const preview =
    amount && exchangeRate ? convertCurrency(Number(amount), Number(exchangeRate)) : null;
  const { onChange, ...rateField } = register("exchange_rate");

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        label={interpolate(dict.expenseForm.exchangeRateLabel, {
          currency,
          base: baseCurrency,
        })}
        icon={ArrowRightLeft}
        type="number"
        inputMode="decimal"
        step="0.0001"
        min="0"
        placeholder="1.00"
        error={error}
        onChange={(e) => {
          onChange(e);
          onManualEdit?.();
        }}
        {...rateField}
      />
      {preview !== null && (
        <p className="text-muted-foreground text-xs">
          ≈ {formatCurrency(preview, baseCurrency, bcp47)}
        </p>
      )}
    </div>
  );
}
