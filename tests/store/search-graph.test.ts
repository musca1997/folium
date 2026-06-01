import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLibraryStore } from "@/lib/store/library";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "folium-search-graph-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("search and graph", () => {
  it("searches blocks and nodes", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const block = await store.createUrlBlock("example.com/garden");
    await store.processBlock(block.id);

    const results = await store.search("example.com");

    expect(results.blocks.length).toBeGreaterThan(0);
    expect(results.nodes.length).toBeGreaterThan(0);
  });

  it("builds graph data from block-node links", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const block = await store.createUrlBlock("example.com/garden");
    await store.processBlock(block.id);

    const graph = await store.getGraphData();

    expect(graph.nodes.some((node) => node.kind === "block")).toBe(true);
    expect(graph.nodes.some((node) => node.kind === "wiki_node")).toBe(true);
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  it("does not include orphan nodes in graph data", async () => {
    await writeFile(`${dir}/library.json`, JSON.stringify({
      blocks: [{
        id: "block_1", type: "url", url: "https://example.com", domain: "example.com", title: "Example", summary: "Summary", contentText: "", contentHtml: "", status: "indexed", screenshotPath: null, previewImage: null, favicon: null, description: "", metadata: {}, visibility: "public", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
        nodeLinks: [{ nodeId: "node_linked", relevance: 0.9, reason: "linked" }],
        topicLinks: [{ topicId: "topic_linked", confidence: 0.9, reason: "linked" }],
      }],
      nodes: [
        { id: "node_linked", type: "Concept", name: "Linked", slug: "linked", description: "Linked node", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "node_orphan", type: "Concept", name: "Orphan", slug: "orphan", description: "Orphan node", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      ],
      topics: [
        { id: "topic_linked", name: "Science", slug: "science", description: "Linked topic", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "topic_orphan", name: "Technology", slug: "technology", description: "Orphan topic", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      ],
      jobs: [],
    }, null, 2));
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    const graph = await store.getGraphData();

    expect(graph.nodes.map((node) => node.id)).toContain("node_linked");
    expect(graph.nodes.map((node) => node.id)).not.toContain("node_orphan");
    expect(graph.nodes.map((node) => node.id)).toContain("topic_linked");
    expect(graph.nodes.map((node) => node.id)).not.toContain("topic_orphan");
  });
});
