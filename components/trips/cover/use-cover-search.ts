"use client";

import { useRef, useState } from "react";
import { searchTripCovers } from "@/app/trips/cover-actions";
import {
  buildDestinationQuery,
  type CoverDestination,
} from "@/lib/images/destination-query";
import type { CoverSearchResult } from "@/lib/images/cover-search";

/**
 * Runs cover searches for the picker. Each distinct query is asked of the
 * server once per form session (switching back to a destination reuses the
 * earlier answer), and only the most recent request may update the UI, so a
 * slow earlier response can't overwrite a newer one.
 */
export function useCoverSearch() {
  const answers = useRef(new Map<string, CoverSearchResult>());
  const latest = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoverSearchResult | null>(null);

  async function search(destination: CoverDestination): Promise<CoverSearchResult> {
    const key = buildDestinationQuery(destination);
    latest.current = key;
    if (!key) {
      const empty: CoverSearchResult = { status: "empty" };
      setResult(empty);
      setLoading(false);
      return empty;
    }
    const known = answers.current.get(key);
    if (known) {
      setResult(known);
      setLoading(false);
      return known;
    }

    setLoading(true);
    let answer: CoverSearchResult;
    try {
      answer = await searchTripCovers(destination);
    } catch {
      // The request itself failed (offline, server error): same as the provider being down.
      answer = { status: "unavailable", reason: "unavailable" };
    }
    if (answer.status !== "unavailable") answers.current.set(key, answer);
    if (latest.current === key) {
      setResult(answer);
      setLoading(false);
    }
    return answer;
  }

  return { loading, result, search };
}
