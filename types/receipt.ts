/** Mirrors receipt-service's ExtractedReceipt (receipt-service/app/models/receipt.py). */
export type ReceiptLineItem = {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
};

export type ReceiptWarning = {
  field: string;
  message: string;
  severity: "warning" | "error";
};

export type ExtractedReceipt = {
  merchant: string | null;
  expense_date: string | null;
  total: number | null;
  subtotal: number | null;
  tax: number | null;
  currency: string | null;
  detected_language: string | null;
  translation: string | null;
  line_items: ReceiptLineItem[];
  warnings: ReceiptWarning[];
  raw_ocr_text: string;
  confidence: number;
};
