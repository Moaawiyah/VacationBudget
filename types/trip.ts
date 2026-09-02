import type { Database } from "@/types/database";

/**
 * Domain-level Trip type. total_budget is normalized to `number` here —
 * Postgres numeric columns come back from Supabase as strings (to avoid
 * float precision loss over the wire), so every read site would otherwise
 * have to remember to parse it. Do that parsing once, at the data-access
 * boundary, not scattered through components.
 */
export type Trip = Omit<Database["public"]["Tables"]["trips"]["Row"], "total_budget"> & {
  total_budget: number;
};

export function toTrip(row: Database["public"]["Tables"]["trips"]["Row"]): Trip {
  return { ...row, total_budget: Number(row.total_budget) };
}

export type TripStatus = "upcoming" | "active" | "completed";
