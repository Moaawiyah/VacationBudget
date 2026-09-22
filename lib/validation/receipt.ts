import { z } from "zod";

/**
 * Validates the shape of what receipt-service returns before this app ever
 * trusts it — that service's own output is itself downstream of an LLM, so
 * it's treated as untrusted input here too, not assumed correct just because
 * it's "our own" service.
 */
const lineItemSchema = z.object({
  description: z.string(),
  icon: z.string(),
  quantity: z.number().nullable(),
  unit_price: z.number().nullable(),
  total_price: z.number().nullable(),
});

const warningSchema = z.object({
  code: z.string(),
  field: z.string(),
  message: z.string(),
  severity: z.enum(["warning", "error"]),
});

export const extractedReceiptSchema = z.object({
  merchant: z.string().nullable(),
  expense_date: z.string().nullable(),
  total: z.number().nullable(),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  currency: z.string().nullable(),
  category: z.string().nullable(),
  detected_language: z.string().nullable(),
  translation: z.string().nullable(),
  line_items: z.array(lineItemSchema),
  warnings: z.array(warningSchema),
  raw_ocr_text: z.string(),
  confidence: z.number(),
});

export const analyzeReceiptResponseSchema = z.object({
  receipt: extractedReceiptSchema,
});
