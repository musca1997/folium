import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLibraryStore } from "@/lib/store/library";
import type { LibraryData } from "@/lib/store/types";

let dir: string;

const timestamp = "2026-01-01T00:00:00.000Z";

async function seedLibrary(data?: Partial<LibraryData>) {
  const base: LibraryData = {
    blocks: [{
      id: "block_1",
      type: "url",
      url: "https://example.com",
      domain: "example.com",
      title: "Example",
      summary: "Summary",
      contentText: "",
      contentHtml: "",
      status: "indexed",
      screenshotPath: null,
      previewImage: null,
      favicon: null,
      description: "Description",
      metadata: {},
      visibility: "private",
      nodeLinks: [],
      topicLinks: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    }],
    nodes: [{ id: "node_1", type: "Concept", name: "AI and Machine Learning", slug: "ai-and-machine-learning", description: "AI node", aliases: [], createdAt: timestamp, updatedAt: timestamp }],
    topics: [{ id: "topic_1", name: "Science", slug: "science", description: "LCC science", aliases: [], externalSource: "lcc", externalId: "lcc:Q", createdAt: timestamp, updatedAt: timestamp }],
    jobs: [],
  };
  await writeFile(join(dir, "library.json"), JSON.stringify({ ...base, ...data }, null, 2));
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "folium-block-curation-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("block-level manual curation", () => {
  it("adds and removes a manual topic link without deleting the topic", async () => {
    await seedLibrary();
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    const added = await store.addBlockTopicLink("block_1", "topic_1");

    expect(added.topicLinks).toEqual([{ topicId: "topic_1", confidence: 1, reason: "Manually curated.", claims: [], evidence: [] }]);
    expect(added.updatedAt).not.toBe(timestamp);

    const duplicate = await store.addBlockTopicLink("block_1", "topic_1");
    expect(duplicate.topicLinks).toHaveLength(1);

    const removed = await store.removeBlockTopicLink("block_1", "topic_1");
    expect(removed.topicLinks).toEqual([]);
    expect(await store.listTopics()).toHaveLength(1);
  });

  it("adds and removes a manual node link without deleting the node", async () => {
    await seedLibrary();
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    const added = await store.addBlockNodeLink("block_1", "node_1");

    expect(added.nodeLinks).toEqual([{ nodeId: "node_1", relevance: 1, reason: "Manually curated.", claims: [], evidence: [] }]);

    const duplicate = await store.addBlockNodeLink("block_1", "node_1");
    expect(duplicate.nodeLinks).toHaveLength(1);

    const removed = await store.removeBlockNodeLink("block_1", "node_1");
    expect(removed.nodeLinks).toEqual([]);
    expect(await store.listNodes()).toHaveLength(1);
  });

  it("creates or reuses a node by name when manually linking", async () => {
    await seedLibrary();
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    const reused = await store.addOrCreateBlockNodeLink("block_1", { name: "AI and Machine Learning", type: "Technology" });
    expect(reused.nodeLinks).toEqual([{ nodeId: "node_1", relevance: 1, reason: "Manually curated.", claims: [], evidence: [] }]);
    expect(await store.listNodes()).toHaveLength(1);

    await store.addOrCreateBlockNodeLink("block_1", { name: "Knowledge Atlas", type: "Concept", description: "A curated knowledge graph." });
    const nodes = await store.listNodes();
    const created = nodes.find((node) => node.slug === "knowledge-atlas");
    expect(created).toMatchObject({ name: "Knowledge Atlas", type: "Concept", description: "A curated knowledge graph.", externalSource: "local" });
    const block = await store.getBlock("block_1");
    expect(block?.nodeLinks.some((link) => link.nodeId === created?.id)).toBe(true);
  });

  it("rejects links to missing topics or nodes", async () => {
    await seedLibrary();
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    await expect(store.addBlockTopicLink("block_1", "missing_topic")).rejects.toThrow("Topic not found");
    await expect(store.addBlockNodeLink("block_1", "missing_node")).rejects.toThrow("Node not found");
    await expect(store.addOrCreateBlockNodeLink("block_1", { name: "" })).rejects.toThrow("Node name is required");

    const block = await store.getBlock("block_1");
    expect(block?.topicLinks).toEqual([]);
    expect(block?.nodeLinks).toEqual([]);
  });
});
