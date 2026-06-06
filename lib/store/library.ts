import { constants } from "node:fs";
import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { browserExtractPage } from "@/lib/ingest/browserExtract";
import { detectVerificationBlock, fetchAndExtractPage } from "@/lib/ingest/extract";
import { analyzeUrl, getAnalysisProviderName } from "@/lib/ingest/process";
import { captureScreenshot, saveScreenshotDataUrl } from "@/lib/ingest/screenshot";
import { checkWaybackAvailability, submitToWayback } from "@/lib/ingest/wayback";
import { canonicalizeUrl, getDomain, getUrlDuplicateKey, normalizeUrl, slugifyNodeName } from "@/lib/ingest/url";
import { reconcileNodeName, reconcileTopicName } from "@/lib/taxonomy/reconcile";
import type { Block, BlockNodeLink, BlockTopicLink, BlockVisibility, CurationState, Job, LibraryData, NodeType, Topic, WikiNode } from "./types";

type StoreOptions = { dataDir?: string; enableNetwork?: boolean; staleJobTimeoutMs?: number; maxJobAttempts?: number };
type AddUrlBlockResult = { block: Block; created: boolean; duplicate: boolean };
type ProvidedContentInput = {
  title?: string;
  description?: string;
  contentText: string;
  contentHtml?: string;
  canonicalUrl?: string;
  previewImage?: string | null;
  favicon?: string | null;
  screenshotDataUrl?: string;
  extractionMethod: "manual" | "browser_extension";
};

const defaultData: LibraryData = { blocks: [], nodes: [], topics: [], jobs: [] };
const DEFAULT_STALE_JOB_TIMEOUT_MS = 15 * 60_000;
const DEFAULT_MAX_JOB_ATTEMPTS = 3;
const nodeTypes: NodeType[] = ["Concept", "Project", "Source", "Technology", "Person", "Work", "Question", "Aesthetic"];

function nowIso(): string { return new Date().toISOString(); }
function makeId(prefix: string): string { return `${prefix}_${crypto.randomUUID()}`; }
function coerceNodeType(type: string): NodeType {
  return nodeTypes.includes(type as NodeType) ? (type as NodeType) : "Concept";
}
function includesQuery(value: string | null | undefined, query: string): boolean { return (value ?? "").toLowerCase().includes(query); }
export function defaultCuration(): CurationState { return { hidden: false, favorite: false, needsReview: true, updatedAt: null }; }
function withCuration<T extends { curation?: CurationState }>(item: T): T & { curation: CurationState } { return { ...item, curation: { ...defaultCuration(), ...(item.curation ?? {}) } }; }
function normalizeBlock(block: Block): Block {
  return withCuration({
    ...block,
    summaryTranslations: block.summaryTranslations ?? {},
    visibility: block.visibility ?? "private",
    nodeLinks: (block.nodeLinks ?? []).map((link) => ({ ...link, claims: link.claims ?? [], evidence: link.evidence ?? [] })),
    topicLinks: (block.topicLinks ?? []).map((link) => ({ ...link, claims: link.claims ?? [], evidence: link.evidence ?? [] })),
  });
}
function normalizeNode(node: WikiNode): WikiNode { return withCuration({ ...node, aliases: node.aliases ?? [] }); }
function normalizeTopic(topic: Topic): Topic { return withCuration({ ...topic, aliases: topic.aliases ?? [] }); }
function normalizeJob(job: Job, maxAttempts: number): Job {
  return {
    ...job,
    error: job.error ?? null,
    attempts: job.attempts ?? 0,
    maxAttempts: job.maxAttempts ?? maxAttempts,
    claimedAt: job.claimedAt ?? null,
    lastError: job.lastError ?? job.error ?? null,
    lastErrorAt: job.lastErrorAt ?? null,
    errorHistory: job.errorHistory ?? [],
  };
}
function visible<T extends { curation?: CurationState }>(items: T[]): T[] { return items.filter((item) => item.curation?.hidden !== true); }
function publicBlocks(data: LibraryData): Block[] { return visible(data.blocks).filter((block) => block.visibility === "public"); }
function linkedIds(blocks: Block[]) {
  return {
    nodeIds: new Set(blocks.flatMap((block) => block.nodeLinks.map((link) => link.nodeId))),
    topicIds: new Set(blocks.flatMap((block) => block.topicLinks.map((link) => link.topicId))),
  };
}
function publicNodes(data: LibraryData): WikiNode[] { const ids = linkedIds(publicBlocks(data)).nodeIds; return visible(data.nodes).filter((node) => ids.has(node.id)).sort((a, b) => a.name.localeCompare(b.name)); }
function publicTopics(data: LibraryData): Topic[] { const ids = linkedIds(publicBlocks(data)).topicIds; return visible(data.topics).filter((topic) => ids.has(topic.id)).sort((a, b) => a.name.localeCompare(b.name)); }
function parseAliases(value: string | string[] | undefined): string[] { const raw = Array.isArray(value) ? value.join("\n") : value ?? ""; return Array.from(new Set(raw.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))); }
function mergeEvidence<T extends { source: string; quote: string }>(items: T[] = []): T[] { const seen = new Set<string>(); return items.filter((item) => { const key = `${item.source}:${item.quote}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
function mergeClaims(items: string[] = []): string[] { return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, 6); }
function mergeTopicLinks(existing: BlockTopicLink, incoming: BlockTopicLink): BlockTopicLink { return { ...existing, confidence: Math.max(existing.confidence, incoming.confidence), reason: existing.reason || incoming.reason, claims: mergeClaims([...(existing.claims ?? []), ...(incoming.claims ?? [])]), evidence: mergeEvidence([...(existing.evidence ?? []), ...(incoming.evidence ?? [])]) }; }
function mergeNodeLinks(existing: BlockNodeLink, incoming: BlockNodeLink): BlockNodeLink { return { ...existing, relevance: Math.max(existing.relevance, incoming.relevance), reason: existing.reason || incoming.reason, claims: mergeClaims([...(existing.claims ?? []), ...(incoming.claims ?? [])]), evidence: mergeEvidence([...(existing.evidence ?? []), ...(incoming.evidence ?? [])]) }; }

export function createLibraryStore(options: StoreOptions = {}) {
  const dataDir = options.dataDir ?? join(process.cwd(), "data");
  const enableNetwork = options.enableNetwork ?? true;
  const staleJobTimeoutMs = options.staleJobTimeoutMs ?? DEFAULT_STALE_JOB_TIMEOUT_MS;
  const maxJobAttempts = options.maxJobAttempts ?? DEFAULT_MAX_JOB_ATTEMPTS;
  const filePath = join(dataDir, "library.json");
  const lockPath = `${filePath}.lock`;
  let lockQueue = Promise.resolve();

  async function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const previous = lockQueue;
    let releaseInProcess!: () => void;
    lockQueue = new Promise<void>((resolve) => { releaseInProcess = resolve; });
    await previous;
    let handle: Awaited<ReturnType<typeof open>> | null = null;
    const started = Date.now();
    while (!handle) {
      try {
        handle = await open(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR);
        await handle.writeFile(`${process.pid} ${new Date().toISOString()}\n`, "utf8");
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "EEXIST") { releaseInProcess(); throw error; }
        if (Date.now() - started > 30_000) { releaseInProcess(); throw new Error("Timed out waiting for library store lock"); }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
    try {
      return await fn();
    } finally {
      await handle.close().catch(() => undefined);
      await rm(lockPath, { force: true }).catch(() => undefined);
      releaseInProcess();
    }
  }

  async function readData(): Promise<LibraryData> {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<LibraryData>;
      return {
        blocks: (parsed.blocks ?? []).map((block) => normalizeBlock(block as Block)),
        nodes: (parsed.nodes ?? []).map((node) => normalizeNode(node as WikiNode)),
        topics: (parsed.topics ?? []).map((topic) => normalizeTopic(topic as Topic)),
        jobs: (parsed.jobs ?? []).map((job) => normalizeJob(job as Job, maxJobAttempts)),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(defaultData);
      throw error;
    }
  }

  function omitImplicitCuration<T extends { curation?: CurationState }>(item: T): T {
    if (item.curation?.hidden === false && item.curation.favorite === false && item.curation.needsReview === true && item.curation.updatedAt === null) {
      const { curation: _curation, ...rest } = item;
      return rest as T;
    }
    return item;
  }

  async function writeData(data: LibraryData): Promise<void> {
    await mkdir(dataDir, { recursive: true });
    const payload = `${JSON.stringify({
      ...data,
      blocks: data.blocks.map(omitImplicitCuration),
      nodes: data.nodes.map(omitImplicitCuration),
      topics: data.topics.map(omitImplicitCuration),
    }, null, 2)}\n`;
    const tmpPath = `${filePath}.tmp-${process.pid}-${crypto.randomUUID()}`;
    const handle = await open(tmpPath, "w");
    try {
      await handle.writeFile(payload, "utf8");
      await handle.sync();
      await handle.close();
      await rename(tmpPath, filePath);
      const dirHandle = await open(dirname(filePath), "r").catch(() => null);
      if (dirHandle) { await dirHandle.sync().catch(() => undefined); await dirHandle.close().catch(() => undefined); }
    } catch (error) {
      await handle.close().catch(() => undefined);
      await rm(tmpPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async function updateData<T>(mutate: (data: LibraryData) => T | Promise<T>): Promise<T> {
    return withLock(async () => {
      const data = await readData();
      const result = await mutate(data);
      await writeData(data);
      return result;
    });
  }

  function recoverStaleRunningJobs(data: LibraryData, timestamp = nowIso()): void {
    const cutoff = Date.now() - staleJobTimeoutMs;
    for (const job of data.jobs) {
      if (job.status !== "running") continue;
      const basis = job.claimedAt ?? job.updatedAt;
      if (new Date(basis).getTime() > cutoff) continue;
      const attempt = job.attempts ?? 0;
      const maxAttemptsForJob = job.maxAttempts ?? maxJobAttempts;
      const message = "Recovered stale running job";
      job.errorHistory = [...(job.errorHistory ?? []), { at: timestamp, message, attempt }];
      job.lastError = message;
      job.lastErrorAt = timestamp;
      job.error = message;
      job.claimedAt = null;
      job.updatedAt = timestamp;
      job.status = attempt < maxAttemptsForJob ? "queued" : "failed";
      if (job.status === "failed") {
        const block = data.blocks.find((item) => item.id === job.blockId);
        if (block) { block.status = "failed"; block.updatedAt = timestamp; }
      }
    }
  }

  return {
    async addUrlBlock(inputUrl: string, visibility: BlockVisibility = "private"): Promise<AddUrlBlockResult> {
      const url = canonicalizeUrl(inputUrl);
      const duplicateKey = getUrlDuplicateKey(url);
      const timestamp = nowIso();
      return updateData((data) => {
        const existingIndex = data.blocks.findIndex((block) => {
          const candidates = [block.url, typeof block.metadata?.canonicalUrl === "string" ? block.metadata.canonicalUrl : null].filter(Boolean) as string[];
          return candidates.some((candidate) => {
            try { return getUrlDuplicateKey(candidate) === duplicateKey; } catch { return false; }
          });
        });
        if (existingIndex !== -1) {
          const [existing] = data.blocks.splice(existingIndex, 1);
          existing.updatedAt = timestamp;
          data.blocks.unshift(existing);
          return { block: existing, created: false, duplicate: true };
        }
        const block: Block = {
          id: makeId("blk"), type: "url", url, domain: getDomain(url), title: getDomain(url), summary: "",
          contentText: "", contentHtml: "", status: "pending", screenshotPath: null, previewImage: null, favicon: null,
          description: "", metadata: { canonicalUrl: url, duplicateKey }, visibility, nodeLinks: [], topicLinks: [], createdAt: timestamp, updatedAt: timestamp, curation: defaultCuration(),
        };
        data.blocks.unshift(block); return { block, created: true, duplicate: false };
      });
    },

    async createUrlBlock(inputUrl: string, visibility: BlockVisibility = "private"): Promise<Block> {
      return (await this.addUrlBlock(inputUrl, visibility)).block;
    },

    async listBlocks(): Promise<Block[]> { return visible((await readData()).blocks); },
    async listPublicBlocks(): Promise<Block[]> { return publicBlocks(await readData()); },
    async getBlock(id: string): Promise<Block | null> { const data = await readData(); return data.blocks.find((block) => block.id === id) ?? null; },
    async getPublicBlock(id: string): Promise<Block | null> { const block = (await this.getBlock(id)); return block?.visibility === "public" ? block : null; },
    async listNodes(): Promise<WikiNode[]> { const data = await readData(); return visible(data.nodes).sort((a, b) => a.name.localeCompare(b.name)); },
    async listPublicNodes(): Promise<WikiNode[]> { return publicNodes(await readData()); },
    async listTopics(): Promise<Topic[]> { const data = await readData(); return visible(data.topics).sort((a, b) => a.name.localeCompare(b.name)); },
    async listPublicTopics(): Promise<Topic[]> { return publicTopics(await readData()); },
    async getTopic(slug: string): Promise<Topic | null> { const data = await readData(); return data.topics.find((topic) => topic.slug === slug) ?? null; },
    async getPublicTopic(slug: string): Promise<Topic | null> { const data = await readData(); return publicTopics(data).find((topic) => topic.slug === slug) ?? null; },
    async getNode(slug: string): Promise<WikiNode | null> { const data = await readData(); return data.nodes.find((node) => node.slug === slug) ?? null; },
    async getPublicNode(slug: string): Promise<WikiNode | null> { const data = await readData(); return publicNodes(data).find((node) => node.slug === slug) ?? null; },
    async getBlocksForNode(slug: string): Promise<Block[]> {
      const data = await readData(); const node = visible(data.nodes).find((item) => item.slug === slug); if (!node) return [];
      return visible(data.blocks).filter((block) => block.nodeLinks.some((link) => link.nodeId === node.id));
    },
    async getBlocksForTopic(slug: string): Promise<Block[]> {
      const data = await readData(); const topic = visible(data.topics).find((item) => item.slug === slug); if (!topic) return [];
      return visible(data.blocks).filter((block) => block.topicLinks.some((link) => link.topicId === topic.id));
    },
    async getNodesForTopic(slug: string): Promise<WikiNode[]> {
      const data = await readData(); const topic = visible(data.topics).find((item) => item.slug === slug); if (!topic) return [];
      const nodeIds = new Set(visible(data.blocks).filter((block) => block.topicLinks.some((link) => link.topicId === topic.id)).flatMap((block) => block.nodeLinks.map((link) => link.nodeId)));
      return visible(data.nodes).filter((node) => nodeIds.has(node.id)).sort((a, b) => a.name.localeCompare(b.name));
    },
    async getPublicBlocksForNode(slug: string): Promise<Block[]> {
      const data = await readData(); const node = publicNodes(data).find((item) => item.slug === slug); if (!node) return [];
      return publicBlocks(data).filter((block) => block.nodeLinks.some((link) => link.nodeId === node.id));
    },
    async getPublicBlocksForTopic(slug: string): Promise<Block[]> {
      const data = await readData(); const topic = publicTopics(data).find((item) => item.slug === slug); if (!topic) return [];
      return publicBlocks(data).filter((block) => block.topicLinks.some((link) => link.topicId === topic.id));
    },
    async getPublicNodesForTopic(slug: string): Promise<WikiNode[]> {
      const data = await readData(); const topic = publicTopics(data).find((item) => item.slug === slug); if (!topic) return [];
      const nodeIds = new Set(publicBlocks(data).filter((block) => block.topicLinks.some((link) => link.topicId === topic.id)).flatMap((block) => block.nodeLinks.map((link) => link.nodeId)));
      return publicNodes(data).filter((node) => nodeIds.has(node.id));
    },

    async search(rawQuery: string): Promise<{ blocks: Block[]; nodes: WikiNode[] }> {
      const query = rawQuery.trim().toLowerCase(); const data = await readData(); const blocks = visible(data.blocks); const nodes = visible(data.nodes); const topics = visible(data.topics); if (!query) return { blocks, nodes };
      const matchedNodes = nodes.filter((node) => includesQuery(node.name, query) || includesQuery(node.description, query) || includesQuery(node.type, query));
      const matchedTopics = topics.filter((topic) => includesQuery(topic.name, query) || includesQuery(topic.description, query));
      const matchedNodeIds = new Set(matchedNodes.map((node) => node.id)); const matchedTopicIds = new Set(matchedTopics.map((topic) => topic.id));
      const matchedBlocks = blocks.filter((block) => includesQuery(block.title, query) || includesQuery(block.url, query) || includesQuery(block.domain, query) || includesQuery(block.description, query) || includesQuery(block.summary, query) || includesQuery(block.contentText, query) || block.nodeLinks.some((link) => matchedNodeIds.has(link.nodeId)) || block.topicLinks.some((link) => matchedTopicIds.has(link.topicId)));
      return { blocks: matchedBlocks, nodes: matchedNodes };
    },

    async searchPublic(rawQuery: string): Promise<{ blocks: Block[]; nodes: WikiNode[] }> {
      const query = rawQuery.trim().toLowerCase(); const data = await readData(); const blocks = publicBlocks(data); const nodes = publicNodes(data); const topics = publicTopics(data); if (!query) return { blocks, nodes };
      const matchedNodes = nodes.filter((node) => includesQuery(node.name, query) || includesQuery(node.description, query) || includesQuery(node.type, query));
      const matchedTopics = topics.filter((topic) => includesQuery(topic.name, query) || includesQuery(topic.description, query));
      const matchedNodeIds = new Set(matchedNodes.map((node) => node.id)); const matchedTopicIds = new Set(matchedTopics.map((topic) => topic.id));
      const matchedBlocks = blocks.filter((block) => includesQuery(block.title, query) || includesQuery(block.url, query) || includesQuery(block.domain, query) || includesQuery(block.description, query) || includesQuery(block.summary, query) || includesQuery(block.contentText, query) || block.nodeLinks.some((link) => matchedNodeIds.has(link.nodeId)) || block.topicLinks.some((link) => matchedTopicIds.has(link.topicId)));
      return { blocks: matchedBlocks, nodes: matchedNodes };
    },

    async getGraphData(): Promise<{
      nodes: Array<{ id: string; label: string; kind: "block" | "wiki_node" | "topic"; href: string; type?: string }>;
      edges: Array<{ id: string; from: string; to: string; relevance: number; kind: "block_node" | "topic_block" }>;
    }> {
      const data = await readData();
      const blocks = visible(data.blocks); const ids = linkedIds(blocks); const nodes = visible(data.nodes).filter((node) => ids.nodeIds.has(node.id)); const topics = visible(data.topics).filter((topic) => ids.topicIds.has(topic.id));
      const graphNodes = [
        ...blocks.map((block) => ({ id: block.id, label: block.title || block.domain, kind: "block" as const, href: `/blocks/${block.id}` })),
        ...nodes.map((node) => ({ id: node.id, label: node.name, kind: "wiki_node" as const, href: `/nodes/${node.slug}`, type: node.type })),
        ...topics.map((topic) => ({ id: topic.id, label: topic.name, kind: "topic" as const, href: `/topics/${topic.slug}` })),
      ];
      const edges = [
        ...blocks.flatMap((block) => block.nodeLinks.filter((link) => ids.nodeIds.has(link.nodeId)).map((link) => ({ id: `${block.id}-${link.nodeId}`, from: block.id, to: link.nodeId, relevance: link.relevance, kind: "block_node" as const }))),
        ...blocks.flatMap((block) => block.topicLinks.filter((link) => ids.topicIds.has(link.topicId)).map((link) => ({ id: `${link.topicId}-${block.id}`, from: link.topicId, to: block.id, relevance: link.confidence, kind: "topic_block" as const }))),
      ];
      return { nodes: graphNodes, edges };
    },

    async getPublicGraphData() {
      const data = await readData();
      const blocks = publicBlocks(data); const nodeIds = linkedIds(blocks).nodeIds; const topicIds = linkedIds(blocks).topicIds;
      const nodes = visible(data.nodes).filter((node) => nodeIds.has(node.id)); const topics = visible(data.topics).filter((topic) => topicIds.has(topic.id));
      const graphNodes = [
        ...blocks.map((block) => ({ id: block.id, label: block.title || block.domain, kind: "block" as const, href: `/blocks/${block.id}` })),
        ...nodes.map((node) => ({ id: node.id, label: node.name, kind: "wiki_node" as const, href: `/nodes/${node.slug}`, type: node.type })),
        ...topics.map((topic) => ({ id: topic.id, label: topic.name, kind: "topic" as const, href: `/topics/${topic.slug}` })),
      ];
      const edges = [
        ...blocks.flatMap((block) => block.nodeLinks.filter((link) => nodeIds.has(link.nodeId)).map((link) => ({ id: `${block.id}-${link.nodeId}`, from: block.id, to: link.nodeId, relevance: link.relevance, kind: "block_node" as const }))),
        ...blocks.flatMap((block) => block.topicLinks.filter((link) => topicIds.has(link.topicId)).map((link) => ({ id: `${link.topicId}-${block.id}`, from: link.topicId, to: block.id, relevance: link.confidence, kind: "topic_block" as const }))),
      ];
      return { nodes: graphNodes, edges };
    },

    async updateBlock(id: string, patch: Partial<Pick<Block, "title" | "summary" | "summaryTranslations" | "description" | "visibility">>): Promise<Block> {
      return updateData((data) => {
        const block = data.blocks.find((item) => item.id === id);
        if (!block) throw new Error(`Block not found: ${id}`);
        if (patch.title !== undefined) block.title = patch.title.trim() || block.domain;
        if (patch.summary !== undefined) block.summary = patch.summary.trim();
        if (patch.summaryTranslations !== undefined) block.summaryTranslations = { ...(block.summaryTranslations ?? {}), zh: patch.summaryTranslations.zh?.trim() || undefined };
        if (patch.description !== undefined) block.description = patch.description.trim();
        if (patch.visibility === "public" || patch.visibility === "private") block.visibility = patch.visibility;
        block.updatedAt = nowIso();
        return block;
      });
    },

    async setBlockPinned(id: string, pinned: boolean): Promise<Block> {
      return updateData((data) => {
        const block = data.blocks.find((item) => item.id === id);
        if (!block) throw new Error(`Block not found: ${id}`);
        block.curation = { ...defaultCuration(), ...(block.curation ?? {}), favorite: pinned, updatedAt: nowIso() };
        block.updatedAt = nowIso();
        return block;
      });
    },

    async addBlockTopicLink(blockId: string, topicId: string): Promise<Block> {
      return updateData((data) => {
        const block = data.blocks.find((item) => item.id === blockId);
        if (!block) throw new Error(`Block not found: ${blockId}`);
        const topic = data.topics.find((item) => item.id === topicId);
        if (!topic) throw new Error(`Topic not found: ${topicId}`);
        if (!block.topicLinks.some((link) => link.topicId === topicId)) block.topicLinks.push({ topicId, confidence: 1, reason: "Manually curated.", claims: [], evidence: [] });
        block.updatedAt = nowIso();
        return block;
      });
    },

    async removeBlockTopicLink(blockId: string, topicId: string): Promise<Block> {
      return updateData((data) => {
        const block = data.blocks.find((item) => item.id === blockId);
        if (!block) throw new Error(`Block not found: ${blockId}`);
        block.topicLinks = block.topicLinks.filter((link) => link.topicId !== topicId);
        block.updatedAt = nowIso();
        return block;
      });
    },

    async addBlockNodeLink(blockId: string, nodeId: string): Promise<Block> {
      return updateData((data) => {
        const block = data.blocks.find((item) => item.id === blockId);
        if (!block) throw new Error(`Block not found: ${blockId}`);
        const node = data.nodes.find((item) => item.id === nodeId);
        if (!node) throw new Error(`Node not found: ${nodeId}`);
        if (!block.nodeLinks.some((link) => link.nodeId === nodeId)) block.nodeLinks.push({ nodeId, relevance: 1, reason: "Manually curated.", claims: [], evidence: [] });
        block.updatedAt = nowIso();
        return block;
      });
    },

    async addOrCreateBlockNodeLink(blockId: string, input: { name: string; type?: string; description?: string }): Promise<Block> {
      const name = input.name.trim();
      if (!name) throw new Error("Node name is required");
      const canonical = await reconcileNodeName(name, (await readData()).nodes);
      return updateData((data) => {
        const block = data.blocks.find((item) => item.id === blockId);
        if (!block) throw new Error(`Block not found: ${blockId}`);
        let node = data.nodes.find((item) => item.slug === canonical.slug || (canonical.externalId && item.externalId === canonical.externalId));
        const timestamp = nowIso();
        if (!node) {
          node = { id: makeId("node"), type: coerceNodeType(input.type ?? "Concept"), name: canonical.name, slug: canonical.slug, description: input.description?.trim() || canonical.description || `Manually curated node for ${canonical.name}.`, aliases: canonical.aliases, externalSource: canonical.externalSource, externalId: canonical.externalId, externalUrl: canonical.externalUrl, createdAt: timestamp, updatedAt: timestamp, curation: defaultCuration() };
          data.nodes.push(node);
        }
        if (!block.nodeLinks.some((link) => link.nodeId === node.id)) block.nodeLinks.push({ nodeId: node.id, relevance: 1, reason: "Manually curated.", claims: [], evidence: [] });
        block.updatedAt = timestamp;
        return block;
      });
    },

    async removeBlockNodeLink(blockId: string, nodeId: string): Promise<Block> {
      return updateData((data) => {
        const block = data.blocks.find((item) => item.id === blockId);
        if (!block) throw new Error(`Block not found: ${blockId}`);
        block.nodeLinks = block.nodeLinks.filter((link) => link.nodeId !== nodeId);
        block.updatedAt = nowIso();
        return block;
      });
    },

    async setProvidedContent(id: string, input: ProvidedContentInput): Promise<Block> {
      const text = input.contentText.replace(/\s+/g, " ").trim();
      if (text.length < 20) throw new Error("Provided content is too short");
      const screenshot = input.screenshotDataUrl ? await saveScreenshotDataUrl(input.screenshotDataUrl, id) : null;
      return updateData((data) => {
        const block = data.blocks.find((item) => item.id === id);
        if (!block) throw new Error(`Block not found: ${id}`);
        const timestamp = nowIso();
        const cleanTitle = input.title?.trim();
        const cleanDescription = input.description?.trim();
        if (cleanTitle) block.title = cleanTitle;
        if (cleanDescription !== undefined) block.description = cleanDescription;
        if (input.previewImage !== undefined) block.previewImage = input.previewImage;
        if (input.favicon !== undefined) block.favicon = input.favicon;
        if (screenshot?.path) block.screenshotPath = screenshot.path;
        block.contentText = text;
        block.contentHtml = input.contentHtml?.trim() ?? "";
        block.status = "thinking";
        block.metadata = { ...block.metadata, canonicalUrl: input.canonicalUrl?.trim() || block.metadata.canonicalUrl || block.url, extractionMethod: input.extractionMethod, extractionBlockedReason: undefined, extractionError: undefined, screenshotError: screenshot?.error ?? undefined };
        block.updatedAt = timestamp;
        const existing = data.jobs.find((job) => job.blockId === id && job.type === "analyze_block" && ["queued", "running"].includes(job.status));
        if (!existing) data.jobs.push({ id: makeId("job"), type: "analyze_block", blockId: id, status: "queued", error: null, attempts: 0, maxAttempts: maxJobAttempts, claimedAt: null, lastError: null, lastErrorAt: null, errorHistory: [], createdAt: timestamp, updatedAt: timestamp });
        return block;
      });
    },

    async setManualContent(id: string, title: string, contentText: string): Promise<Block> {
      return this.setProvidedContent(id, { title, contentText, extractionMethod: "manual" });
    },

    async deleteBlock(id: string): Promise<void> {
      await updateData((data) => {
        const index = data.blocks.findIndex((item) => item.id === id);
        if (index === -1) throw new Error(`Block not found: ${id}`);
        data.blocks.splice(index, 1);
        data.jobs = data.jobs.filter((job) => job.blockId !== id);
      });
    },

    async updateTopic(id: string, patch: { name?: string; description?: string; aliases?: string[] | string }): Promise<Topic> {
      return updateData((data) => { const topic = data.topics.find((item) => item.id === id); if (!topic) throw new Error(`Topic not found: ${id}`);
        if (patch.name !== undefined) { topic.name = patch.name.trim() || topic.name; topic.slug = slugifyNodeName(topic.name); }
        if (patch.description !== undefined) topic.description = patch.description.trim();
        if (patch.aliases !== undefined) topic.aliases = parseAliases(patch.aliases);
        topic.updatedAt = nowIso(); return topic; });
    },
    async mergeTopic(sourceId: string, targetId: string): Promise<Topic> {
      if (sourceId === targetId) throw new Error("Cannot merge a topic into itself");
      const data = await readData(); const source = data.topics.find((item) => item.id === sourceId); const target = data.topics.find((item) => item.id === targetId);
      if (!source || !target) throw new Error("Topic not found");
      target.aliases = parseAliases([...(target.aliases ?? []), source.name, source.slug, ...(source.aliases ?? [])]); target.updatedAt = nowIso();
      for (const block of data.blocks) {
        const byId = new Map<string, BlockTopicLink>();
        for (const link of block.topicLinks.map((link) => link.topicId === sourceId ? { ...link, topicId: targetId } : link)) {
          const existing = byId.get(link.topicId); byId.set(link.topicId, existing ? mergeTopicLinks(existing, link) : link);
        }
        block.topicLinks = [...byId.values()];
      }
      data.topics = data.topics.filter((item) => item.id !== sourceId); await writeData(data); return target;
    },
    async deleteTopic(id: string): Promise<void> {
      await updateData((data) => { data.topics = data.topics.filter((topic) => topic.id !== id);
        for (const block of data.blocks) block.topicLinks = block.topicLinks.filter((link) => link.topicId !== id);
      });
    },
    async updateNode(id: string, patch: { name?: string; description?: string; aliases?: string[] | string; type?: string }): Promise<WikiNode> {
      return updateData((data) => { const node = data.nodes.find((item) => item.id === id); if (!node) throw new Error(`Node not found: ${id}`);
        if (patch.name !== undefined) { node.name = patch.name.trim() || node.name; node.slug = slugifyNodeName(node.name); }
        if (patch.description !== undefined) node.description = patch.description.trim();
        if (patch.aliases !== undefined) node.aliases = parseAliases(patch.aliases);
        if (patch.type !== undefined) node.type = coerceNodeType(patch.type);
        node.updatedAt = nowIso(); return node; });
    },
    async mergeNode(sourceId: string, targetId: string): Promise<WikiNode> {
      if (sourceId === targetId) throw new Error("Cannot merge a node into itself");
      const data = await readData(); const source = data.nodes.find((item) => item.id === sourceId); const target = data.nodes.find((item) => item.id === targetId);
      if (!source || !target) throw new Error("Node not found");
      target.aliases = parseAliases([...(target.aliases ?? []), source.name, source.slug, ...(source.aliases ?? [])]); target.updatedAt = nowIso();
      for (const block of data.blocks) {
        const byId = new Map<string, BlockNodeLink>();
        for (const link of block.nodeLinks.map((link) => link.nodeId === sourceId ? { ...link, nodeId: targetId } : link)) {
          const existing = byId.get(link.nodeId); byId.set(link.nodeId, existing ? mergeNodeLinks(existing, link) : link);
        }
        block.nodeLinks = [...byId.values()];
      }
      data.nodes = data.nodes.filter((item) => item.id !== sourceId); await writeData(data); return target;
    },
    async deleteNode(id: string): Promise<void> {
      await updateData((data) => { data.nodes = data.nodes.filter((node) => node.id !== id);
        for (const block of data.blocks) block.nodeLinks = block.nodeLinks.filter((link) => link.nodeId !== id);
      });
    },

    async listJobs(): Promise<Job[]> { return (await readData()).jobs; },
    async listJobsWithBlocks(): Promise<Array<{ job: Job; block: Block | null }>> { const data = await readData(); return data.jobs.map((job) => ({ job, block: data.blocks.find((block) => block.id === job.blockId) ?? null })); },
    async getJobSummary(): Promise<Record<Job["status"], number>> { const data = await readData(); const summary: Record<Job["status"], number> = { queued: 0, running: 0, done: 0, failed: 0 }; for (const job of data.jobs) summary[job.status] += 1; return summary; },
    async enqueueBlockJob(blockId: string, type: Job["type"]): Promise<Job> {
      return updateData((data) => {
        recoverStaleRunningJobs(data);
        const block = data.blocks.find((item) => item.id === blockId); if (!block) throw new Error(`Block not found: ${blockId}`);
        const existing = data.jobs.find((job) => job.blockId === blockId && job.type === type && ["queued", "running"].includes(job.status)); if (existing) return existing;
        const timestamp = nowIso(); const job: Job = { id: makeId("job"), type, blockId, status: "queued", error: null, attempts: 0, maxAttempts: maxJobAttempts, claimedAt: null, lastError: null, lastErrorAt: null, errorHistory: [], createdAt: timestamp, updatedAt: timestamp };
        data.jobs.push(job); return job;
      });
    },
    async enqueueProcessBlock(blockId: string): Promise<Job> { return this.enqueueBlockJob(blockId, "process_block"); },
    async enqueueAnalyzeBlock(blockId: string): Promise<Job> { return this.enqueueBlockJob(blockId, "analyze_block"); },
    async enqueueRecaptureBlock(blockId: string): Promise<Job> { return this.enqueueBlockJob(blockId, "recapture_block"); },
    async retryBlockProcessing(blockId: string): Promise<Job> {
      await updateData((data) => { const block = data.blocks.find((item) => item.id === blockId); if (!block) throw new Error(`Block not found: ${blockId}`);
        block.status = "pending"; block.metadata = { ...block.metadata, extractionError: undefined, screenshotError: undefined }; block.updatedAt = nowIso(); });
      return this.enqueueProcessBlock(blockId);
    },
    async claimNextJob(): Promise<Job | null> {
      return updateData((data) => {
        const timestamp = nowIso(); recoverStaleRunningJobs(data, timestamp);
        const job = data.jobs.find((item) => item.status === "queued"); if (!job) return null;
        job.status = "running"; job.claimedAt = timestamp; job.attempts = (job.attempts ?? 0) + 1; job.maxAttempts = job.maxAttempts ?? maxJobAttempts; job.updatedAt = timestamp;
        return job;
      });
    },
    async markJobDone(jobId: string): Promise<Job> {
      return updateData((data) => { const job = data.jobs.find((item) => item.id === jobId); if (!job) throw new Error(`Job not found: ${jobId}`); job.status = "done"; job.error = null; job.lastError = null; job.lastErrorAt = null; job.claimedAt = null; job.updatedAt = nowIso(); return job; });
    },
    async markJobFailed(jobId: string, error: string): Promise<Job> {
      return updateData((data) => {
        const job = data.jobs.find((item) => item.id === jobId); if (!job) throw new Error(`Job not found: ${jobId}`);
        const timestamp = nowIso(); const attempt = job.attempts ?? 0; const maxAttemptsForJob = job.maxAttempts ?? maxJobAttempts;
        job.error = error; job.lastError = error; job.lastErrorAt = timestamp; job.errorHistory = [...(job.errorHistory ?? []), { at: timestamp, message: error, attempt }]; job.updatedAt = timestamp; job.claimedAt = null;
        if (attempt < maxAttemptsForJob) job.status = "queued";
        else { job.status = "failed"; const block = data.blocks.find((item) => item.id === job.blockId); if (block) { block.status = "failed"; block.updatedAt = timestamp; } }
        return job;
      });
    },
    async runNextJob(): Promise<boolean> {
      const job = await this.claimNextJob(); if (!job) return false;
      try {
        if (job.type === "analyze_block") await this.analyzeBlock(job.blockId);
        else if (job.type === "recapture_block") await this.recaptureBlock(job.blockId);
        else await this.processBlock(job.blockId);
        await this.markJobDone(job.id); return true;
      } catch (error) { await this.markJobFailed(job.id, error instanceof Error ? error.message : "Unknown job error"); return true; }
    },

    async extractAndCaptureBlock(id: string): Promise<Block> {
      const data = await readData(); const block = data.blocks.find((item) => item.id === id); if (!block) throw new Error(`Block not found: ${id}`);
      block.status = "fetching"; block.updatedAt = nowIso(); await writeData(data);
      if (enableNetwork) {
        try {
          const extracted = await fetchAndExtractPage(block.url);
          const blockedReason = detectVerificationBlock({ title: extracted.title, textContent: extracted.textContent });
          if (blockedReason) throw new Error(`Verification required: ${blockedReason}`);
          if (extracted.textContent.length < 300) throw new Error(`Fetch extraction produced too little text (${extracted.textContent.length} chars)`);
          block.title = extracted.title || block.domain; block.description = extracted.description; block.previewImage = extracted.previewImage; block.favicon = extracted.favicon; block.contentText = extracted.textContent; block.contentHtml = extracted.htmlContent; block.metadata = { ...block.metadata, canonicalUrl: extracted.canonicalUrl, extractionMethod: "fetch", extractionBlockedReason: undefined, extractionError: undefined };
        } catch (error) {
          const fetchError = error instanceof Error ? error.message : "Unknown extraction error";
          try {
            const extracted = await browserExtractPage(block.url);
            const blockedReason = detectVerificationBlock({ title: extracted.title, textContent: extracted.textContent });
            if (blockedReason) throw new Error(`Verification required: ${blockedReason}`);
            block.title = extracted.title || block.domain; block.description = extracted.description; block.previewImage = extracted.previewImage; block.favicon = extracted.favicon; block.contentText = extracted.textContent; block.contentHtml = extracted.htmlContent; block.metadata = { ...block.metadata, canonicalUrl: extracted.canonicalUrl, extractionMethod: "browser", extractionBlockedReason: undefined, fetchExtractionError: fetchError, extractionError: undefined, browserExtractionTextLength: extracted.textContent.length };
          } catch (browserError) {
            const browserMessage = browserError instanceof Error ? browserError.message : "Unknown browser extraction error";
            const match = browserMessage.match(/Verification required: ([a-z_]+)/);
            block.metadata = { ...block.metadata, extractionMethod: "fallback", extractionError: browserMessage, extractionBlockedReason: match?.[1], fetchExtractionError: fetchError, canonicalUrl: block.url };
          }
        }
        block.status = "screenshotting"; block.updatedAt = nowIso(); await writeData(data);
        const screenshot = await captureScreenshot(block.url, block.id); if (screenshot.path) block.screenshotPath = screenshot.path; if (screenshot.error) block.metadata = { ...block.metadata, screenshotError: screenshot.error }; else block.metadata = { ...block.metadata, screenshotError: undefined };
        block.metadata = { ...block.metadata, wayback: await checkWaybackAvailability(block.url) };
      }
      if (typeof block.metadata.extractionBlockedReason === "string") block.status = "failed";
      block.updatedAt = nowIso(); await writeData(data); return block;
    },

    async analyzeBlock(id: string): Promise<Block> {
      const data = await readData(); const block = data.blocks.find((item) => item.id === id); if (!block) throw new Error(`Block not found: ${id}`);
      block.status = "thinking"; block.updatedAt = nowIso(); await writeData(data);
      const existingTopics = data.topics.map((topic) => ({ name: topic.name, description: topic.description }));
      const existingNodes = data.nodes.map((node) => ({ name: node.name, type: node.type, description: node.description }));
      const analysis = await analyzeUrl(block.url, { title: block.title, description: block.description, textContent: block.contentText, existingTopics, existingNodes });
      const timestamp = nowIso(); block.title = block.title || block.domain; block.summary = analysis.summary; block.summaryTranslations = analysis.summaryTranslations ?? {}; block.status = "indexed"; block.metadata = { ...block.metadata, provider: await getAnalysisProviderName() }; block.nodeLinks = []; block.topicLinks = []; block.updatedAt = timestamp;

      for (const generated of analysis.topics) {
        const canonical = await reconcileTopicName(generated.name, data.topics);
        let topic = data.topics.find((item) => item.slug === canonical.slug || (canonical.externalId && item.externalId === canonical.externalId));
        if (!topic) {
          topic = { id: makeId("topic"), name: canonical.name, slug: canonical.slug, description: canonical.description || generated.description, aliases: Array.from(new Set([...(canonical.aliases ?? []), generated.name].filter((alias) => slugifyNodeName(alias) !== canonical.slug))), externalSource: canonical.externalSource, externalId: canonical.externalId, externalUrl: canonical.externalUrl, createdAt: timestamp, updatedAt: timestamp, curation: defaultCuration() };
          data.topics.push(topic);
        }
        block.topicLinks.push({ topicId: topic.id, confidence: generated.confidence, reason: generated.description || `Related to ${topic.name}`, claims: generated.claims, evidence: generated.evidence });
      }
      for (const generated of analysis.nodes) {
        const canonical = await reconcileNodeName(generated.name, data.nodes);
        let node = data.nodes.find((item) => item.slug === canonical.slug || (canonical.externalId && item.externalId === canonical.externalId));
        if (!node) {
          node = { id: makeId("node"), type: coerceNodeType(generated.type), name: canonical.name, slug: canonical.slug, description: canonical.description || generated.description, aliases: Array.from(new Set([...(canonical.aliases ?? []), generated.name].filter((alias) => slugifyNodeName(alias) !== canonical.slug))), externalSource: canonical.externalSource, externalId: canonical.externalId, externalUrl: canonical.externalUrl, createdAt: timestamp, updatedAt: timestamp, curation: defaultCuration() };
          data.nodes.push(node);
        }
        block.nodeLinks.push({ nodeId: node.id, relevance: generated.relevance, reason: generated.description || `Related to ${node.name}`, claims: generated.claims, evidence: generated.evidence });
      }
      await writeData(data); return block;
    },

    async recaptureBlock(id: string): Promise<Block> {
      const block = await this.extractAndCaptureBlock(id);
      const data = await readData(); const fresh = data.blocks.find((item) => item.id === id); if (!fresh) throw new Error(`Block not found: ${id}`);
      fresh.status = block.summary || fresh.nodeLinks.length || fresh.topicLinks.length ? "indexed" : "pending"; fresh.updatedAt = nowIso(); await writeData(data); return fresh;
    },

    async submitBlockToWayback(id: string): Promise<Block> {
      const existing = await this.getBlock(id);
      if (!existing) throw new Error(`Block not found: ${id}`);
      const wayback = await submitToWayback(existing.url);
      return updateData((data) => {
        const block = data.blocks.find((item) => item.id === id);
        if (!block) throw new Error(`Block not found: ${id}`);
        block.metadata = { ...block.metadata, wayback };
        block.updatedAt = nowIso();
        return block;
      });
    },

    async processBlock(id: string): Promise<Block> {
      const block = await this.extractAndCaptureBlock(id);
      if (typeof block.metadata.extractionBlockedReason === "string") throw new Error(`Verification required: ${block.metadata.extractionBlockedReason}`);
      return this.analyzeBlock(id);
    },
  };
}

export const libraryStore = createLibraryStore();
