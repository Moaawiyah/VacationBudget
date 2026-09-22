import { NextResponse } from "next/server";
import { analyzeReceipt } from "@/lib/receipts/receipt-client";
import {
  statusForReceiptError,
  type ReceiptErrorCode,
} from "@/lib/receipts/receipt-errors";
import { rateLimit } from "@/lib/rate-limit";
import { getSdk } from "@/lib/sdk/server";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/heic", "image/heif"]);
const MAX_BYTES = 15 * 1024 * 1024;
// Every call runs OCR plus a paid LLM request, so cap each user's usage.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

/**
 * Authenticates the caller and checks trip ownership itself (rather than
 * delegating to receipt-service), so that service never needs to know about
 * Supabase sessions or which user owns which trip.
 */
/** Every failure is `{ code }`; the page translates it (lib/receipts/receipt-errors). */
function failure(code: ReceiptErrorCode) {
  return NextResponse.json({ code }, { status: statusForReceiptError(code) });
}

export async function POST(request: Request) {
  const sdk = await getSdk();
  const user = await sdk.auth.getUser();
  if (!user) return NextResponse.json({ code: "unauthorized" }, { status: 401 });

  const { allowed, retryAfterSeconds } = rateLimit(
    `receipts:${user.id}`,
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!allowed) {
    return NextResponse.json(
      { code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const formData = await request.formData();
  const tripId = formData.get("tripId");
  const file = formData.get("file");
  const languageHint = formData.get("languageHint");

  if (typeof tripId !== "string" || !tripId) {
    return failure("not_found");
  }
  const canAccessTrip = (await sdk.trips.accessibleBaseCurrency(tripId)) !== null;
  if (!canAccessTrip) {
    return failure("not_found");
  }
  if (!(file instanceof File)) {
    return failure("unsupported_image");
  }
  if (file.size === 0) return failure("unsupported_image");
  if (file.size > MAX_BYTES) return failure("image_too_large");
  if (!ALLOWED_TYPES.has(file.type)) {
    return failure("unsupported_image");
  }

  // The user's own categories go to receipt-service so the LLM can pick one
  // of them by name. It only ever gets names — ids stay on this side, and a
  // name that isn't in this list is rejected before it comes back.
  const categories = await sdk.categories.listPickable(user.id);

  const result = await analyzeReceipt(
    file,
    typeof languageHint === "string" ? languageHint : undefined,
    categories.map((category) => category.name),
  );
  if ("code" in result) return failure(result.code);
  return NextResponse.json(result);
}
