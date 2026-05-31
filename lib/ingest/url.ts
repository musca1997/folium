export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const trackingParams = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
]);

export function canonicalizeUrl(input: string): string {
  const url = new URL(normalizeUrl(input));
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) url.port = "";
  for (const key of Array.from(url.searchParams.keys())) {
    if (trackingParams.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  const sorted = Array.from(url.searchParams.entries()).sort(([aKey, aValue], [bKey, bValue]) => aKey.localeCompare(bKey) || aValue.localeCompare(bValue));
  url.search = "";
  for (const [key, value] of sorted) url.searchParams.append(key, value);
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/g, "");
  return url.toString();
}

export function getUrlDuplicateKey(input: string): string {
  const url = new URL(canonicalizeUrl(input));
  url.hostname = url.hostname.replace(/^www\./i, "");
  return url.toString();
}

export function getDomain(input: string): string {
  const url = new URL(normalizeUrl(input));
  return url.hostname.replace(/^www\./i, "");
}

export function slugifyNodeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
