import { notFound } from "next/navigation";
import { ScanLine } from "lucide-react";
import { getSdk } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { ReceiptUploadFlow } from "@/components/receipts/receipt-upload-flow";

export default async function ReceiptExpensePage({
  params,
}: PageProps<"/trip/[id]/expenses/receipt">) {
  const { id } = await params;
  const sdk = await getSdk();
  const [trip, categories, dict] = await Promise.all([
    sdk.trips.get(id),
    sdk.categories.list(),
    getDictionary(),
  ]);

  if (!trip) notFound();

  return (
    <main className="safe-x flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-foreground flex items-center gap-2 text-xl font-semibold">
        <ScanLine aria-hidden className="text-primary h-5 w-5 shrink-0" />
        {dict.receipts.pageTitle}
      </h1>
      <ReceiptUploadFlow
        tripId={id}
        baseCurrency={trip.base_currency}
        categories={categories}
      />
    </main>
  );
}
