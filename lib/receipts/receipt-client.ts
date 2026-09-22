import { logger } from "@/lib/logger";
import { analyzeReceiptResponseSchema } from "@/lib/validation/receipt";
import type { ExtractedReceipt } from "@/types/receipt";
import { receiptErrorCode, type ReceiptErrorCode } from "./receipt-errors";

export type AnalyzeReceiptResult =
  { receipt: ExtractedReceipt } | { code: ReceiptErrorCode };

const TIMEOUT_MS = 60_000;

/**
 * Calls the Python receipt-intelligence service. Only ever invoked from the
 * `/api/receipts/analyze` Route Handler (never from a Client Component) — it
 * holds RECEIPT_SERVICE_TOKEN, which, like every other server secret in this
 * app, stays out of the client bundle simply by not being NEXT_PUBLIC_-prefixed.
 */
export async function analyzeReceipt(
  file: File,
  languageHint?: string,
  categoryNames: string[] = [],
): Promise<AnalyzeReceiptResult> {
  const url = process.env.RECEIPT_SERVICE_URL;
  const token = process.env.RECEIPT_SERVICE_TOKEN;
  if (!url || !token) {
    logger.error("receipts.analyze failed", { error: "Receipt service not configured" });
    return { code: "analysis_unavailable" };
  }

  const form = new FormData();
  form.append("file", file, file.name);
  if (languageHint) form.append("language_hint", languageHint);
  // Comma-joined, so a name containing a comma would split — categories are
  // short labels, and receipt-service drops anything it doesn't recognize.
  if (categoryNames.length > 0) form.append("categories", categoryNames.join(","));

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
      // The body is receipt-service's { code, message } — no receipt content.
      const body: unknown = await response.json().catch(() => null);
      const code = receiptErrorCode(response.status, body);
      const serviceCode =
        body && typeof body === "object" && "code" in body ? body.code : null;
      logger.error("receipts.analyze failed", {
        status: response.status,
        serviceCode,
        code,
      });
      return { code };
    }

    const parsed = analyzeReceiptResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      logger.error("receipts.analyze failed", { error: "Malformed response shape" });
      return { code: "unknown" };
    }
    return { receipt: parsed.data.receipt };
  } catch (error) {
    logger.error("receipts.analyze failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Includes our own abort at TIMEOUT_MS: the service outlived its deadline.
    return { code: "analysis_unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
