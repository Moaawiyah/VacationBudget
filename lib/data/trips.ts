import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { toTrip, type Trip } from "@/types/trip";

/**
 * `cache()` dedupes calls with the same argument within a single request —
 * the trip/[id] layout and its page both need the trip, but this only ever
 * hits the database once per request rather than twice.
 */
export const getTrip = cache(async (id: string): Promise<Trip | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("trips").select("*").eq("id", id).single();
  return data ? toTrip(data) : null;
});
