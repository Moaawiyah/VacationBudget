import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/export/to-csv";

describe("toCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("writes a header from every key seen across all rows", () => {
    const csv = toCsv([{ a: 1, b: 2 }, { a: 3, c: 4 }]);
    expect(csv.split("\n")[0]).toBe("a,b,c");
  });

  it("quotes and escapes a value containing a comma or quote", () => {
    const csv = toCsv([{ note: 'has, a "comma"' }]);
    expect(csv).toBe('note\n"has, a ""comma"""');
  });

  it("quotes a value containing a newline, kept intact inside the quotes", () => {
    const csv = toCsv([{ note: "line1\nline2" }]);
    expect(csv).toBe('note\n"line1\nline2"');
  });

  it("renders null/undefined as an empty field", () => {
    const csv = toCsv([{ a: null, b: undefined }]);
    expect(csv.split("\n")[1]).toBe(",");
  });
});
