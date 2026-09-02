/** Joins class names, skipping falsy values — a minimal stand-in for clsx. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
