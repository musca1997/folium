import type { Topic, WikiNode } from "@/lib/store/types";
import { slugifyNodeName } from "@/lib/ingest/url";
import { findWikidataMatch, type WikidataMatch } from "./wikidata";
import { findLccTopicByName, type LccCanonicalTopic } from "./lcc";

export type CanonicalReference = {
  name: string;
  slug: string;
  description?: string;
  aliases: string[];
  externalSource?: "wikidata" | "local" | "llm" | "lcc";
  externalId?: string;
  externalUrl?: string;
};

function normalize(value: string): string {
  return slugifyNodeName(value);
}

function aliasesOf(item: { aliases?: string[] }): string[] {
  return item.aliases ?? [];
}

export function findLocalTopicMatch(name: string, topics: Topic[]): Topic | null {
  const key = normalize(name);
  return topics.find((topic) => topic.slug === key || aliasesOf(topic).some((alias) => normalize(alias) === key)) ?? null;
}

export function findLocalNodeMatch(name: string, nodes: WikiNode[]): WikiNode | null {
  const key = normalize(name);
  return nodes.find((node) => node.slug === key || aliasesOf(node).some((alias) => normalize(alias) === key)) ?? null;
}

function fromWikidata(match: WikidataMatch): CanonicalReference {
  return { name: match.label, slug: slugifyNodeName(match.label), description: match.description, aliases: match.aliases, externalSource: "wikidata", externalId: match.id, externalUrl: match.url };
}

function fromLcc(topic: LccCanonicalTopic): CanonicalReference {
  return { name: topic.name, slug: topic.slug, description: topic.description, aliases: topic.aliases, externalSource: "lcc", externalId: `lcc:${topic.code}`, externalUrl: topic.externalUrl };
}

function isStrongWikidataMatch(query: string, match: WikidataMatch): boolean {
  const key = normalize(query);
  return normalize(match.label) === key || match.aliases.some((alias) => normalize(alias) === key);
}

export async function reconcileTopicName(name: string, topics: Topic[]): Promise<CanonicalReference> {
  const lcc = findLccTopicByName(name);
  if (lcc) {
    const existing = findLocalTopicMatch(lcc.name, topics) ?? findLocalTopicMatch(lcc.slug, topics);
    if (existing) return { name: existing.name, slug: existing.slug, description: existing.description, aliases: existing.aliases ?? [], externalSource: existing.externalSource, externalId: existing.externalId, externalUrl: existing.externalUrl };
    return fromLcc(lcc);
  }
  const local = findLocalTopicMatch(name, topics);
  if (local) return { name: local.name, slug: local.slug, description: local.description, aliases: local.aliases ?? [], externalSource: local.externalSource, externalId: local.externalId, externalUrl: local.externalUrl };
  const match = await findWikidataMatch(name);
  if (match && isStrongWikidataMatch(name, match)) {
    const existing = findLocalTopicMatch(match.label, topics) ?? match.aliases.map((alias) => findLocalTopicMatch(alias, topics)).find(Boolean) ?? null;
    if (existing) return { name: existing.name, slug: existing.slug, description: existing.description, aliases: existing.aliases ?? [], externalSource: existing.externalSource, externalId: existing.externalId, externalUrl: existing.externalUrl };
    return fromWikidata(match);
  }
  return { name, slug: slugifyNodeName(name), aliases: [], externalSource: "local" };
}

export async function reconcileNodeName(name: string, nodes: WikiNode[]): Promise<CanonicalReference> {
  const local = findLocalNodeMatch(name, nodes);
  if (local) return { name: local.name, slug: local.slug, description: local.description, aliases: local.aliases ?? [], externalSource: local.externalSource, externalId: local.externalId, externalUrl: local.externalUrl };
  const match = await findWikidataMatch(name);
  if (match && isStrongWikidataMatch(name, match)) {
    const existing = findLocalNodeMatch(match.label, nodes) ?? match.aliases.map((alias) => findLocalNodeMatch(alias, nodes)).find(Boolean) ?? null;
    if (existing) return { name: existing.name, slug: existing.slug, description: existing.description, aliases: existing.aliases ?? [], externalSource: existing.externalSource, externalId: existing.externalId, externalUrl: existing.externalUrl };
    return fromWikidata(match);
  }
  return { name, slug: slugifyNodeName(name), aliases: [], externalSource: "local" };
}
