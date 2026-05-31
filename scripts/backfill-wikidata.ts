import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { reconcileNodeName, reconcileTopicName } from "@/lib/taxonomy/reconcile";
import { slugifyNodeName } from "@/lib/ingest/url";
import type { LibraryData, Topic, WikiNode } from "@/lib/store/types";

const libraryPath = join(process.cwd(), "data", "library.json");
const backupPath = join(process.cwd(), "data", `library.backup.wikidata-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);

type MergeReport = { from: string; to: string; reason: string };

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

async function canonicalizeTopics(data: LibraryData): Promise<MergeReport[]> {
  const reports: MergeReport[] = [];
  const next: Topic[] = [];
  const idMap = new Map<string, string>();

  for (const topic of data.topics) {
    const canonical = await reconcileTopicName(topic.name, next);
    const existing = next.find((item) => item.slug === canonical.slug || (canonical.externalId && item.externalId === canonical.externalId));
    if (existing) {
      idMap.set(topic.id, existing.id);
      existing.aliases = uniq([...(existing.aliases ?? []), topic.name, ...(topic.aliases ?? []), ...(canonical.aliases ?? [])]).filter((alias) => slugifyNodeName(alias) !== existing.slug);
      if (!existing.externalId && canonical.externalId) { existing.externalSource = canonical.externalSource; existing.externalId = canonical.externalId; existing.externalUrl = canonical.externalUrl; }
      reports.push({ from: topic.name, to: existing.name, reason: "topic merge" });
    } else {
      const updated: Topic = {
        ...topic,
        name: canonical.name,
        slug: canonical.slug,
        description: topic.description || canonical.description || "",
        aliases: uniq([...(canonical.aliases ?? []), topic.name, ...(topic.aliases ?? [])]).filter((alias) => slugifyNodeName(alias) !== canonical.slug),
        externalSource: canonical.externalSource ?? topic.externalSource,
        externalId: canonical.externalId ?? topic.externalId,
        externalUrl: canonical.externalUrl ?? topic.externalUrl,
      };
      idMap.set(topic.id, updated.id);
      next.push(updated);
      if (updated.name !== topic.name) reports.push({ from: topic.name, to: updated.name, reason: "topic canonical rename" });
    }
  }

  for (const block of data.blocks) {
    const seen = new Set<string>();
    block.topicLinks = block.topicLinks.flatMap((link) => {
      const topicId = idMap.get(link.topicId) ?? link.topicId;
      if (seen.has(topicId)) return [];
      seen.add(topicId);
      return [{ ...link, topicId }];
    });
  }
  data.topics = next;
  return reports;
}

async function canonicalizeNodes(data: LibraryData): Promise<MergeReport[]> {
  const reports: MergeReport[] = [];
  const next: WikiNode[] = [];
  const idMap = new Map<string, string>();

  for (const node of data.nodes) {
    const canonical = await reconcileNodeName(node.name, next);
    const existing = next.find((item) => item.slug === canonical.slug || (canonical.externalId && item.externalId === canonical.externalId));
    if (existing) {
      idMap.set(node.id, existing.id);
      existing.aliases = uniq([...(existing.aliases ?? []), node.name, ...(node.aliases ?? []), ...(canonical.aliases ?? [])]).filter((alias) => slugifyNodeName(alias) !== existing.slug);
      if (!existing.externalId && canonical.externalId) { existing.externalSource = canonical.externalSource; existing.externalId = canonical.externalId; existing.externalUrl = canonical.externalUrl; }
      reports.push({ from: node.name, to: existing.name, reason: "node merge" });
    } else {
      const updated: WikiNode = {
        ...node,
        name: canonical.name,
        slug: canonical.slug,
        description: node.description || canonical.description || "",
        aliases: uniq([...(canonical.aliases ?? []), node.name, ...(node.aliases ?? [])]).filter((alias) => slugifyNodeName(alias) !== canonical.slug),
        externalSource: canonical.externalSource ?? node.externalSource,
        externalId: canonical.externalId ?? node.externalId,
        externalUrl: canonical.externalUrl ?? node.externalUrl,
      };
      idMap.set(node.id, updated.id);
      next.push(updated);
      if (updated.name !== node.name) reports.push({ from: node.name, to: updated.name, reason: "node canonical rename" });
    }
  }

  for (const block of data.blocks) {
    const seen = new Set<string>();
    block.nodeLinks = block.nodeLinks.flatMap((link) => {
      const nodeId = idMap.get(link.nodeId) ?? link.nodeId;
      if (seen.has(nodeId)) return [];
      seen.add(nodeId);
      return [{ ...link, nodeId }];
    });
  }
  data.nodes = next;
  return reports;
}

async function main() {
  await copyFile(libraryPath, backupPath);
  const data = JSON.parse(await readFile(libraryPath, "utf8")) as LibraryData;
  const before = { topics: data.topics.length, nodes: data.nodes.length };
  const topicReports = await canonicalizeTopics(data);
  const nodeReports = await canonicalizeNodes(data);
  await writeFile(libraryPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  const after = { topics: data.topics.length, nodes: data.nodes.length };
  console.log(JSON.stringify({ backupPath, before, after, topicChanges: topicReports.length, nodeChanges: nodeReports.length, topicReports: topicReports.slice(0, 30), nodeReports: nodeReports.slice(0, 50) }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
