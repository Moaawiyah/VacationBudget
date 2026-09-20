import { logger } from "@/lib/logger";
import { analyzeReceiptResponseSchema } from "@/lib/validation/receipt";
import type { ExtractedReceipt } from "@/types/receipt";

export type AnalyzeReceiptResult = { receipt: ExtractedReceipt } | { error: string };

const TIMEOUT_MS = 45_000;

/**
 * Calls the Python receipt-intelligence service. Only ever invoked from the
 * `/api/receipts/analyze` Route Handler (never from a Client Component) — it
 * holds RECEIPT_SERVICE_TOKEN, which, like every other server secret in this
 * app, stays out of the client bundle simply by not being NEXT_PUBLIC_-prefixed.
 */
export async function analyzeReceipt(
  file: File,
  languageHint?: string,
): Promise<AnalyzeReceiptResult> {
  const url = process.env.RECEIPT_SERVICE_URL;
  const token = process.env.RECEIPT_SERVICE_TOKEN;
  if (!url || !token) {
    logger.error("receipts.analyze failed", { error: "Receipt service not configured" });
    return { error: "Receipt scanning is not available right now." };
  }

  const form = new FormData();
  form.append("file", file, file.name);
  if (languageHint) form.append("language_hint", languageHint);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/v1/receipts/analyze`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) {
      logger.error("receipts.analyze failed", { status: response.status });
      return { error: "Could not read that receipt. Try a clearer photo." };
    }

    const parsed = analyzeReceiptResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      logger.error("receipts.analyze failed", { error: "Malformed response shape" });
      return { error: "Could not read that receipt. Try a clearer photo." };
    }
    return { receipt: parsed.data.receipt };
  } catch (error) {
    logger.error("receipts.analyze failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { error: "Could not reach the receipt scanner. Try again." };
  } finally {
    clearTimeout(timeout);
  }
}
