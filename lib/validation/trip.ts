import { z } from "zod";
import { CURRENCY_CODES } from "@/lib/currency/constants";

export const tripSchema = z
  .object({
    name: z.string().trim().min(1, "Trip name is required").max(100),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    destination: z.string().trim().min(1, "Destination is required").max(200),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    base_currency: z.enum(CURRENCY_CODES, { message: "Choose a currency" }),
    total_budget: z.coerce.number().min(0, "Budget can't be negative"),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "End date must be on or after the start date",
    path: ["end_date"],
  });

export type TripInput = z.infer<typeof tripSchema>;
