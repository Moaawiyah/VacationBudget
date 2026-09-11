"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Calendar, MapPin, PenLine, StickyNote, Store } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ExpenseFormValues } from "./use-expense-form-effects";

type ExpenseDetailFieldsProps = {
  register: UseFormRegister<ExpenseFormValues>;
  errors: FieldErrors<ExpenseFormValues>;
};

/** Description, date, and the optional merchant / location / notes fields. */
export function ExpenseDetailFields({ register, errors }: ExpenseDetailFieldsProps) {
  const t = useDictionary().expenseForm;

  return (
    <>
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
    </>
  );
}
