// Country catalogue for the trip "destination" picker.
//
// Storage convention: a trip's `destination` column stores comma-separated
// ENGLISH country names (e.g. "France, Italy"), which stay human-readable in
// the DB and backward-compatible with older free-text destinations.
// Everything shown to the user is re-localized at render time from ISO codes.
//
// Pure modules (no "use client") — usable from Server and Client Components.
export * from "./codes";
export * from "./catalogue";
export * from "./search";
export * from "./destination";
