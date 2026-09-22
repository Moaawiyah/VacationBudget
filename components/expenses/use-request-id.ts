"use client";

import { useState } from "react";
import { newRequestId } from "@/lib/request-id";

/**
 * One idempotency key per mounted form — that is, per "create this expense"
 * intent. Resubmitting after a validation error reuses it (nothing was saved
 * yet); a successful save navigates away, so a new form means a new key.
 */
export function useRequestId(): string {
  const [requestId] = useState(newRequestId);
  return requestId;
}
