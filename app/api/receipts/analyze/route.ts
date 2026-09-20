import { NextResponse } from "next/server";
import { analyzeReceipt } from "@/lib/receipts/receipt-client";
import { getSdk } from "@/lib/sdk/server";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/heic", "image/heif"]);
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Authenticates the caller and checks trip ownership itself (rather than
 * delegating to receipt-service), so that service never needs to know about
 * Supabase sessions or which user owns which trip.
 */
export async function POST(request: Request) {
  const sdk = await getSdk();
  const user = await sdk.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const tripId = formData.get("tripId");
  const file = formData.get("file");
  const languageHint = formData.get("languageHint");

  if (typeof tripId !== "string" || !tripId) {
    return NextResponse.json({ error: "Missing tripId" }, { status: 400 });
  }
  const ownsTrip = (await sdk.trips.ownedBaseCurrency(user.id, tripId)) !== null;
  if (!ownsTrip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is empty or too large" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  // The user's own categories go to receipt-service so the LLM can pick one
  // of them by name. It only ever gets names — ids stay on this side, and a
  // name that isn't in this list is rejected before it comes back.
  const categories = await sdk.categories.list();

  const result = await analyzeReceipt(
    file,
    typeof languageHint === "string" ? languageHint : undefined,
    categories.map((category) => category.name),
  );
  if ("error" in result) return NextResponse.json(result, { status: 502 });
  return NextResponse.json(result);
}
