import { NextResponse } from "next/server";
import { getSdk } from "@/lib/sdk/server";
import { toCsv } from "@/lib/export/to-csv";

/**
 * "Export My Data": everything this account is entitled to see about
 * itself (AccountService.exportData is RLS-scoped — see its own comment),
 * never another user's private data. JSON carries the full export; CSV is
 * the expenses table alone, for a spreadsheet.
 */
export async function GET(request: Request) {
  const sdk = await getSdk();
  const user = await sdk.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const format = new URL(request.url).searchParams.get("format");
  const data = await sdk.account.exportData(user.id);

  if (format === "csv") {
    return new NextResponse(toCsv(data.expenses), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="my-expenses.csv"',
      },
    });
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="my-data.json"',
    },
  });
}
