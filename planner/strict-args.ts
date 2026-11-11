/**
 * SDK-independent unknown-argument rejection behind wire schemas.
 * Pattern: lumen strict-args.ts. Returns the list of unknown keys (empty = ok).
 */
export function strictArgs(value: unknown, allowed: readonly string[]): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>).filter((k) => !allowed.includes(k));
}
