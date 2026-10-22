/** Light check for a mobile field. Empty is missing. Anything else needs 8 to 15 digits. */
export function mobileIssue(value: string): "empty" | "bad" | null {
  const trimmed = value.trim();
  if (!trimmed) return "empty";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return "bad";
  return null;
}

export type GeoPoint = { lat: number; lng: number };

export function formatCoord(n: number) {
  if (!Number.isFinite(n)) return "0";
  const text = n.toFixed(6).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return text === "-0" ? "0" : text;
}

/** Google Maps link appended to an outgoing booking message. */
export function mapsUrl(lat: number, lng: number) {
  return `https://maps.google.com/?q=${formatCoord(lat)},${formatCoord(lng)}`;
}
