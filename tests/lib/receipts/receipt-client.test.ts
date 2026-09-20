import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeReceipt } from "@/lib/receipts/receipt-client";
import { muteErrorLog } from "../../helpers/fake-db";

function validReceiptJson() {
  return {
    receipt: {
      merchant: "Cafe",
      expense_date: "2026-01-10",
      total: 12.5,
      subtotal: null,
      tax: null,
      currency: "EUR",
      category: null,
      detected_language: "en",
      translation: null,
      line_items: [],
      warnings: [],
      raw_ocr_text: "CAFE",
      confidence: 1,
    },
  };
}

const file = new File(["fake-bytes"], "receipt.jpg", { type: "image/jpeg" });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("analyzeReceipt", () => {
  it("returns an error without calling the network when unconfigured", async () => {
    muteErrorLog();
    vi.stubEnv("RECEIPT_SERVICE_URL", "");
    vi.stubEnv("RECEIPT_SERVICE_TOKEN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await analyzeReceipt(file);

    expect(result).toEqual({ error: "Receipt scanning is not available right now." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the file with a bearer token and returns the validated receipt", async () => {
    vi.stubEnv("RECEIPT_SERVICE_URL", "http://receipt-service:8000");
    vi.stubEnv("RECEIPT_SERVICE_TOKEN", "secret-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validReceiptJson(),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await analyzeReceipt(file, "en");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://receipt-service:8000/v1/receipts/analyze");
    expect(init.headers.Authorization).toBe("Bearer secret-token");
    expect(result).toEqual({ receipt: validReceiptJson().receipt });
  });

  it("forwards the user's category names for the LLM to choose from", async () => {
    vi.stubEnv("RECEIPT_SERVICE_URL", "http://receipt-service:8000");
    vi.stubEnv("RECEIPT_SERVICE_TOKEN", "secret-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validReceiptJson(),
    });
    vi.stubGlobal("fetch", fetchMock);

    await analyzeReceipt(file, "en", ["Food", "Transport"]);

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get("categories")).toBe("Food,Transport");
  });

  it("omits the categories field entirely when there are none", async () => {
    vi.stubEnv("RECEIPT_SERVICE_URL", "http://receipt-service:8000");
    vi.stubEnv("RECEIPT_SERVICE_TOKEN", "secret-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => validReceiptJson(),
    });
    vi.stubGlobal("fetch", fetchMock);

    await analyzeReceipt(file);

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get("categories")).toBeNull();
  });

  it("returns a friendly error on a non-OK response", async () => {
    muteErrorLog();
    vi.stubEnv("RECEIPT_SERVICE_URL", "http://receipt-service:8000");
    vi.stubEnv("RECEIPT_SERVICE_TOKEN", "secret-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));

    expect(await analyzeReceipt(file)).toEqual({
      error: "Could not read that receipt. Try a clearer photo.",
    });
  });

  it("returns a friendly error when the response body doesn't match the schema", async () => {
    muteErrorLog();
    vi.stubEnv("RECEIPT_SERVICE_URL", "http://receipt-service:8000");
    vi.stubEnv("RECEIPT_SERVICE_TOKEN", "secret-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ nonsense: true }) }),
    );

    expect(await analyzeReceipt(file)).toEqual({
      error: "Could not read that receipt. Try a clearer photo.",
    });
  });

  it("returns a friendly error when the request throws (network failure)", async () => {
    muteErrorLog();
    vi.stubEnv("RECEIPT_SERVICE_URL", "http://receipt-service:8000");
    vi.stubEnv("RECEIPT_SERVICE_TOKEN", "secret-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    expect(await analyzeReceipt(file)).toEqual({
      error: "Could not reach the receipt scanner. Try again.",
    });
  });
});
