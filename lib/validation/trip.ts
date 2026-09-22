import { z } from "zod";
import { CURRENCY_CODES } from "@/lib/currency/constants";
import type { Dictionary } from "@/lib/i18n/types";
import { tripCoverSchema } from "@/lib/images/cover-schema";

export function tripSchema(t: Dictionary["validation"]) {
  return z
    .object({
      name: z.string().trim().min(1, t.tripNameRequired).max(100),
      description: z
        .string()
        .trim()
        .max(500, t.descriptionMax500)
        .optional()
        .or(z.literal("")),
      // Room for a comma-separated list of every country (see lib/countries.ts).
      destination: z.string().trim().min(1, t.destinationRequired).max(5000),
      start_date: z.string().min(1, t.startDateRequired),
      end_date: z.string().min(1, t.endDateRequired),
      base_currency: z.enum(CURRENCY_CODES, { message: t.currencyChoose }),
      total_budget: z.coerce.number().min(0, t.budgetNegative),
      // Omitted: leave the stored cover alone. null: use the default cover.
      cover: tripCoverSchema.nullable().optional(),
    })
    .refine((data) => data.end_date >= data.start_date, {
      message: t.endDateBeforeStart,
      path: ["end_date"],
    });
}

export type TripInput = z.infer<ReturnType<typeof tripSchema>>;
