import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLibraryStore } from "@/lib/store/library";
import type { Block, LibraryData, Topic, WikiNode } from "@/lib/store/types";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "folium-related-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const now = "2026-01-01T00:00:00.000Z";

function block(input: Partial<Block> & { id: string; domain: string; topicIds?: string[]; nodeIds?: string[] }): Block {
  return {
    id: input.id,
    type: "url",
    url: `https://${input.domain}/${input.id}`,
    domain: input.domain,
    title: input.title ?? input.id,
    summary: input.summary ?? "",
    contentText: input.contentText ?? "",
    contentHtml: "",
    status: input.status ?? "indexed",
    screenshotPath: null,
    previewImage: null,
    favicon: null,
    description: input.description ?? "",
    metadata: {},
    visibility: input.visibility ?? "private",
    nodeLinks: (input.nodeIds ?? []).map((nodeId) => ({ nodeId, relevance: 0.8, reason: "shared node" })),
    topicLinks: (input.topicIds ?? []).map((topicId) => ({ topicId, confidence: 0.8, reason: "shared topic" })),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    curation: input.curation,
  };
}

const topics: Topic[] = [
  { id: "topic-ai", name: "AI Agents", slug: "ai-agents", description: "", createdAt: now, updatedAt: now },
  { id: "topic-web", name: "Web Archiving", slug: "web-archiving", description: "", createdAt: now, updatedAt: now },
  { id: "topic-tools", name: "Tools", slug: "tools", description: "", createdAt: now, updatedAt: now },
];

const nodes: WikiNode[] = [
  { id: "node-firefox", type: "Technology", name: "Firefox", slug: "firefox", description: "", createdAt: now, updatedAt: now },
  { id: "node-wayback", type: "Technology", name: "Wayback Machine", slug: "wayback-machine", description: "", createdAt: now, updatedAt: now },
  { id: "node-ai", type: "Concept", name: "AI and Machine Learning", slug: "ai-and-machine-learning", description: "", createdAt: now, updatedAt: now },
  { id: "node-source", type: "Source", name: "x.com", slug: "x-com", description: "", createdAt: now, updatedAt: now },
];

async function writeLibrary(data: LibraryData) {
  await writeFile(join(dir, "library.json"), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

describe("related blocks", () => {
  it("ranks visible related blocks by shared topics, nodes, keywords, and domain", async () => {
    await writeLibrary({
      topics,
      nodes,
      jobs: [],
      blocks: [
        block({ id: "target", domain: "example.com", topicIds: ["topic-ai", "topic-web"], nodeIds: ["node-firefox"] }),
        block({ id: "best", domain: "example.com", topicIds: ["topic-ai", "topic-web"], nodeIds: ["node-firefox"] }),
        block({ id: "topic-only", domain: "other.com", topicIds: ["topic-ai"], nodeIds: [] }),
        block({ id: "domain-only", domain: "example.com", topicIds: [], nodeIds: [] }),
        block({ id: "hidden", domain: "example.com", topicIds: ["topic-ai"], nodeIds: ["node-firefox"], curation: { hidden: true, favorite: false, needsReview: false, updatedAt: now } }),
      ],
    });
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    const related = await store.getRelatedBlocks("target");

    expect(related.map((item) => item.block.id)).toEqual(["best", "topic-only"]);
    expect(related[0].reasons).toEqual(["Firefox", "Web Archiving", "AI Agents", "same domain"]);
    expect(related[0].score).toBeGreaterThan(related[1].score);
    expect(related[1].reasons).toEqual(["AI Agents"]);
  });

  it("filters noisy same-domain-only blocks but allows strong title keyword matches", async () => {
    await writeLibrary({
      topics,
      nodes,
      jobs: [],
      blocks: [
        block({ id: "target", domain: "example.com", title: "Firefox archive notes" }),
        block({ id: "same-domain-only", domain: "example.com", title: "Unrelated cooking post" }),
        block({ id: "keyword-related", domain: "other.com", title: "Firefox archive workflow" }),
        block({ id: "summary-noise", domain: "noise.com", title: "Random notes", summary: "Firefox archive words appear outside the title" }),
      ],
    });
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    const related = await store.getRelatedBlocks("target");

    expect(related.map((item) => item.block.id)).toEqual(["keyword-related"]);
    expect(related[0].reasons).toEqual(["keyword: archive", "keyword: firefox"]);
  });

  it("ranks rare topics and specific keywords above generic common overlaps", async () => {
    await writeLibrary({
      topics,
      nodes,
      jobs: [],
      blocks: [
        block({ id: "target", domain: "example.com", title: "Firefox Wayback archive tools", topicIds: ["topic-tools", "topic-web"] }),
        block({ id: "rare-specific", domain: "other.com", title: "Wayback archive for Firefox", topicIds: ["topic-tools", "topic-web"] }),
        block({ id: "common-only", domain: "elsewhere.com", title: "General tools overview", topicIds: ["topic-tools"] }),
        block({ id: "common-1", domain: "a.com", title: "Tools roundup", topicIds: ["topic-tools"] }),
        block({ id: "common-2", domain: "b.com", title: "Tools guide", topicIds: ["topic-tools"] }),
      ],
    });
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    const related = await store.getRelatedBlocks("target");

    expect(related.map((item) => item.block.id)).toEqual(["rare-specific"]);
    expect(related[0].reasons).toEqual(["Web Archiving", "keyword: archive", "keyword: firefox"]);
  });

  it("ignores browser chrome keywords and source-only nodes", async () => {
    await writeLibrary({
      topics,
      nodes,
      jobs: [],
      blocks: [
        block({ id: "target", domain: "x.com", title: "Large model training notes", summary: "To view keyboard shortcuts press question mark. See new posts and conversation.", nodeIds: ["node-source", "node-ai"] }),
        block({ id: "chrome-noise", domain: "news.com", title: "Unrelated article", summary: "See question post and keyboard shortcuts model training.", nodeIds: ["node-source"] }),
        block({ id: "ai-related", domain: "arxiv.org", title: "Language model training evaluation", summary: "A paper about model training and inference.", nodeIds: ["node-ai"] }),
      ],
    });
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    const related = await store.getRelatedBlocks("target");

    expect(related.map((item) => item.block.id)).toEqual(["ai-related"]);
    expect(related[0].reasons).toEqual(["AI and Machine Learning", "keyword: model", "keyword: training"]);
  });

  it("limits public related blocks to public content", async () => {
    await writeLibrary({
      topics,
      nodes,
      jobs: [],
      blocks: [
        block({ id: "target", domain: "example.com", visibility: "public", title: "AI agent architecture", topicIds: ["topic-ai"], nodeIds: ["node-firefox"] }),
        block({ id: "public-related", domain: "other.com", visibility: "public", title: "Agent architecture notes", topicIds: ["topic-ai"], nodeIds: [] }),
        block({ id: "private-related", domain: "example.com", visibility: "private", topicIds: ["topic-ai"], nodeIds: ["node-firefox"] }),
      ],
    });
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    const related = await store.getPublicRelatedBlocks("target");

    expect(related.map((item) => item.block.id)).toEqual(["public-related"]);
    expect(related[0].reasons).toEqual(["keyword: agent", "keyword: architecture"]);
  });
});
