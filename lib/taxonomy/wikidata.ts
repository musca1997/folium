import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { slugifyNodeName } from "@/lib/ingest/url";

const cachePath = join(process.cwd(), "data", "wikidata-cache.json");
const WIKIDATA_ENDPOINT = "https://www.wikidata.org/w/api.php";

export type WikidataMatch = {
  id: string;
  label: string;
  description?: string;
  aliases: string[];
  url: string;
};

type CacheEntry = { query: string; match: WikidataMatch | null; updatedAt: string };
type CacheFile = { entries: Record<string, CacheEntry> };

function cacheKey(query: string): string {
  return slugifyNodeName(query.trim().toLowerCase());
}

async function readCache(): Promise<CacheFile> {
  try { return JSON.parse(await readFile(cachePath, "utf8")) as CacheFile; } catch { return { entries: {} }; }
}

async function writeCache(cache: CacheFile): Promise<void> {
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ");
}

async function fetchWikidataSearch(query: string): Promise<WikidataMatch | null> {
  const url = new URL(WIKIDATA_ENDPOINT);
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("search", query);
  url.searchParams.set("language", "en");
  url.searchParams.set("uselang", "en");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("origin", "*");
  const timeoutMs = Number(process.env.FOLIUM_WIKIDATA_TIMEOUT_MS ?? 2500);
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { "User-Agent": "Folium/0.1 (self-hosted taxonomy reconciliation; local instance)", "Accept": "application/json" } });
  if (!response.ok) return null;
  const payload = await response.json() as { search?: Array<{ id?: string; label?: string; description?: string; aliases?: string[]; concepturi?: string }> };
  const first = payload.search?.[0];
  if (!first?.id || !first.label) return null;
  return {
    id: first.id,
    label: normalizeLabel(first.label),
    description: first.description,
    aliases: (first.aliases ?? []).map(normalizeLabel).filter(Boolean).slice(0, 12),
    url: first.concepturi ?? `https://www.wikidata.org/wiki/${first.id}`,
  };
}

export async function findWikidataMatch(query: string, options: { enabled?: boolean } = {}): Promise<WikidataMatch | null> {
  const trimmed = query.trim();
  if (!trimmed || options.enabled === false || process.env.VITEST || process.env.FOLIUM_WIKIDATA_ENABLED === "false") return null;
  const key = cacheKey(trimmed);
  const cache = await readCache();
  if (cache.entries[key]) return cache.entries[key].match;
  let match: WikidataMatch | null = null;
  try { match = await fetchWikidataSearch(trimmed); } catch { match = null; }
  cache.entries[key] = { query: trimmed, match, updatedAt: new Date().toISOString() };
  await writeCache(cache);
  return match;
}
