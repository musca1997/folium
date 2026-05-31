import { mkdtemp, rm } from "node:fs/promises";
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
});
