/**
 * Parses a duration string (e.g., "7d", "24h", "60m", "30s") into milliseconds.
 * Returns fallbackMs if the input is invalid or falsy.
 */
export function parseDurationToMs(
  duration: string | number | undefined | null,
  fallbackMs: number,
): number {
  if (!duration) return fallbackMs;
  if (typeof duration === "number") return duration;
  if (/^\d+$/.test(duration)) return parseInt(duration, 10);

  const match = duration.match(/^(\d+)([dhms])$/i);
  if (!match) return fallbackMs;

  const value = parseInt(match[1], 10);
  switch (match[2].toLowerCase()) {
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "m":
      return value * 60 * 1000;
    case "s":
      return value * 1000;
    default:
      return fallbackMs;
  }
}
