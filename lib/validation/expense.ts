import { z } from "zod";

export const expenseSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount"),
  category_id: z.string().uuid("Choose a category"),
  description: z.string().trim().min(1, "Description is required").max(200),
  expense_date: z.string().min(1, "Date is required"),
  merchant: z.string().trim().max(200).optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
});

export type CategoryInput = z.infer<typeof categorySchema>;
