/**
 * Fills `{token}` placeholders in a dictionary string with values.
 *
 * Dictionary entries are plain strings, not functions — the dictionary
 * object is passed as a prop from the Server Component root layout into the
 * Client Component <LocaleProvider>, and React Server Components can only
 * serialize plain data across that boundary, not function values. Templated
 * strings (e.g. `dict.trips.deleteConfirm`, `'Delete "{name}"?'`) are
 * resolved with this helper instead of being dictionary-defined functions.
 */
export function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}
