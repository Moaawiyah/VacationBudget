import type { Dictionary } from "./types";

/**
 * The 13 system categories seeded in supabase/migrations/0003_categories.sql
 * are stored as fixed English text (`name` has no locale column) — this maps
 * that stored English name to a dictionary key so the UI can display it
 * translated. A user's own custom categories have no entry here and fall
 * through to the raw stored name, unchanged — there's nothing to translate,
 * since the user typed that name themselves.
 */
const SYSTEM_CATEGORY_KEYS: Record<string, keyof Dictionary["categories"]> = {
  Flights: "flights",
  Accommodation: "accommodation",
  "Car Rental": "carRental",
  Fuel: "fuel",
  "Public Transport": "publicTransport",
  Food: "food",
  Activities: "activities",
  Shopping: "shopping",
  Parking: "parking",
  Tolls: "tolls",
  Insurance: "insurance",
  Coffee: "coffee",
  Other: "other",
};

export function translateCategoryName(name: string, dict: Dictionary): string {
  const key = SYSTEM_CATEGORY_KEYS[name];
  return key ? dict.categories[key] : name;
}
