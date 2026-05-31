import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { findWikidataMatch } from "@/lib/taxonomy/wikidata";
import { slugifyNodeName } from "@/lib/ingest/url";
import type { LibraryData, Topic, WikiNode } from "@/lib/store/types";

const libraryPath = join(process.cwd(), "data", "library.json");
const backupPath = join(process.cwd(), "data", `library.backup.wikidata-fast-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);

type Item = Topic | WikiNode;
type Match = Awaited<ReturnType<typeof findWikidataMatch>>;

function uniq(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = slugifyNodeName(trimmed);
    if (seen.has(key)) continue;
    seen.add(key); out.push(trimmed);
  }
  return out;
}

async function parallelMap<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }));
  return results;
}

function canonicalizeCollection<T extends Item>(items: T[], matches: Map<string, Match>, kind: "topic" | "node") {
  const next: T[] = [];
  const idMap = new Map<string, string>();
  const reports: Array<{ from: string; to: string; reason: string }> = [];

  for (const item of items) {
    const match = matches.get(item.id);
    const canonicalName = match?.label ?? item.name;
    const canonicalSlug = slugifyNodeName(canonicalName);
    const existing = next.find((entry) => entry.slug === canonicalSlug || (match?.id && entry.externalId === match.id));
    if (existing) {
      idMap.set(item.id, existing.id);
      existing.aliases = uniq([...(existing.aliases ?? []), item.name, ...(item.aliases ?? []), ...(match?.aliases ?? [])]).filter((alias) => slugifyNodeName(alias) !== existing.slug);
      if (!existing.externalId && match) {
        existing.externalSource = "wikidata";
        existing.externalId = match.id;
        existing.externalUrl = match.url;
      }
      reports.push({ from: item.name, to: existing.name, reason: `${kind} merge` });
      continue;
    }
    const updated = {
      ...item,
      name: canonicalName,
      slug: canonicalSlug,
      description: item.description || match?.description || "",
      aliases: uniq([...(match?.aliases ?? []), item.name, ...(item.aliases ?? [])]).filter((alias) => slugifyNodeName(alias) !== canonicalSlug),
      externalSource: match ? "wikidata" as const : item.externalSource,
      externalId: match?.id ?? item.externalId,
      externalUrl: match?.url ?? item.externalUrl,
    } as T;
    idMap.set(item.id, updated.id);
    next.push(updated);
    if (updated.name !== item.name) reports.push({ from: item.name, to: updated.name, reason: `${kind} canonical rename` });
  }
  return { next, idMap, reports };
}

async function main() {
  await copyFile(libraryPath, backupPath);
  const data = JSON.parse(await readFile(libraryPath, "utf8")) as LibraryData;
  const all = [...data.topics.map((item) => ({ kind: "topic" as const, item })), ...data.nodes.map((item) => ({ kind: "node" as const, item }))];
  const before = { topics: data.topics.length, nodes: data.nodes.length };
  const matchesArray = await parallelMap(all, Number(process.env.FOLIUM_WIKIDATA_CONCURRENCY ?? 8), async ({ item }) => {
    const match = await findWikidataMatch(item.name);
    return [item.id, match] as const;
  });
  const matches = new Map<string, Match>(matchesArray);

  const topics = canonicalizeCollection(data.topics, matches, "topic");
  data.topics = topics.next;
  for (const block of data.blocks) {
    const seen = new Set<string>();
    block.topicLinks = block.topicLinks.flatMap((link) => {
      const topicId = topics.idMap.get(link.topicId) ?? link.topicId;
      if (seen.has(topicId)) return [];
      seen.add(topicId); return [{ ...link, topicId }];
    });
  }

  const nodes = canonicalizeCollection(data.nodes, matches, "node");
  data.nodes = nodes.next;
  for (const block of data.blocks) {
    const seen = new Set<string>();
    block.nodeLinks = block.nodeLinks.flatMap((link) => {
      const nodeId = nodes.idMap.get(link.nodeId) ?? link.nodeId;
      if (seen.has(nodeId)) return [];
      seen.add(nodeId); return [{ ...link, nodeId }];
    });
  }

  await writeFile(libraryPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ backupPath, before, after: { topics: data.topics.length, nodes: data.nodes.length }, topicChanges: topics.reports.length, nodeChanges: nodes.reports.length, topicReports: topics.reports.slice(0, 40), nodeReports: nodes.reports.slice(0, 80) }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
