import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { extractedReceiptSchema } from "@/lib/validation/receipt";

/**
 * contracts/receipt-analyze.schema.json is generated from receipt-service's
 * Pydantic models (see receipt-service/tests/test_contract.py). Checking the
 * Zod schema against it means a field added or renamed in Python fails here
 * until the web app handles it — rather than every analysis failing Zod
 * validation in production, which is what drift would otherwise cause.
 */
type JsonObject = { properties: Record<string, unknown> };
const contract = JSON.parse(
  readFileSync(join(process.cwd(), "contracts", "receipt-analyze.schema.json"), "utf8"),
) as {
  response: { $defs: Record<string, JsonObject> };
  error: { required: string[] };
};
const defs = contract.response.$defs;

function keysOf(schema: z.ZodObject): string[] {
  return Object.keys(schema.shape).sort();
}

function fieldsOf(definition: string): string[] {
  return Object.keys(defs[definition].properties).sort();
}

const lineItem = (extractedReceiptSchema.shape.line_items as z.ZodArray<z.ZodObject>)
  .element;
const warning = (extractedReceiptSchema.shape.warnings as z.ZodArray<z.ZodObject>)
  .element;

describe("receipt-service response contract", () => {
  it("ExtractedReceipt fields match receipt-service", () => {
    expect(keysOf(extractedReceiptSchema)).toEqual(fieldsOf("ExtractedReceipt"));
  });

  it("LineItem fields match receipt-service", () => {
    expect(keysOf(lineItem)).toEqual(fieldsOf("LineItem"));
  });

  it("Warning fields match receipt-service", () => {
    expect(keysOf(warning)).toEqual(fieldsOf("Warning"));
  });

  it("error bodies carry the code the web app maps to a message", () => {
    expect(contract.error.required).toContain("code");
  });
});
