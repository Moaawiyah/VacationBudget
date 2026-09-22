"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Coins, Luggage, PenLine, Wallet } from "lucide-react";
import type { z } from "zod";
import { tripSchema, type TripInput } from "@/lib/validation/trip";
import { CURRENCIES } from "@/lib/currency/constants";
import { useDictionary } from "@/components/i18n/locale-provider";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CountryPicker } from "@/components/trips/country-picker";
import { CoverPicker } from "@/components/trips/cover/cover-picker";

// The raw form fields (before Zod coercion, e.g. total_budget as whatever the
// <input type="number"> gives it) differ from TripInput (after coercion, a
// real number). react-hook-form's third generic lets handleSubmit hand back
// the already-validated/coerced TripInput shape to onSubmit.
export type TripFormValues = z.input<ReturnType<typeof tripSchema>>;

type TripFormProps = {
  defaultValues?: Partial<TripFormValues>;
  onSubmit: (input: TripInput) => Promise<{ error: string } | void>;
  submitLabel: string;
};

export function TripForm({ defaultValues, onSubmit, submitLabel }: TripFormProps) {
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TripFormValues, unknown, TripInput>({
    resolver: zodResolver(tripSchema(dict.validation)),
    defaultValues: { base_currency: "EUR", ...defaultValues },
  });
  const destination = useWatch({ control, name: "destination" }) ?? "";

  function submit(data: TripInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await onSubmit(data);
      if (result?.error) setFormError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <Input
        label={dict.tripForm.name}
        icon={Luggage}
        error={errors.name?.message}
        {...register("name")}
      />
      <Controller
        control={control}
        name="destination"
        render={({ field }) => (
          <CountryPicker
            ref={field.ref}
            name={field.name}
            label={dict.tripForm.destination}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.destination?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="cover"
        render={({ field }) => (
          <CoverPicker
            destination={destination}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={dict.tripForm.startDate}
          type="date"
          error={errors.start_date?.message}
          {...register("start_date")}
        />
        <Input
          label={dict.tripForm.endDate}
          type="date"
          error={errors.end_date?.message}
          {...register("end_date")}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select
          label={dict.tripForm.currency}
          icon={Coins}
          error={errors.base_currency?.message}
          {...register("base_currency")}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </Select>
        <Input
          label={dict.tripForm.totalBudget}
          icon={Wallet}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          error={errors.total_budget?.message}
          {...register("total_budget")}
        />
      </div>
      <Input
        label={dict.tripForm.descriptionOptional}
        icon={PenLine}
        error={errors.description?.message}
        {...register("description")}
      />
      {formError && <p className="text-danger text-sm">{formError}</p>}
      <Button type="submit" loading={isPending} className="mt-2">
        {submitLabel}
      </Button>
    </form>
  );
}
