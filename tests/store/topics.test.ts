import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLibraryStore } from "@/lib/store/library";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "folium-topics-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("topic clusters", () => {
  it("processing creates topic clusters and block-topic links", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const block = await store.createUrlBlock("https://example.com/security");
    const processed = await store.processBlock(block.id);
    const topics = await store.listTopics();

    expect(topics.length).toBeGreaterThan(0);
    expect(processed.topicLinks.length).toBeGreaterThan(0);
  });

  it("graph data includes topic hubs", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const block = await store.createUrlBlock("https://example.com/security");
    await store.processBlock(block.id);

    const graph = await store.getGraphData();

    expect(graph.nodes.some((node) => node.kind === "topic")).toBe(true);
    expect(graph.edges.some((edge) => edge.kind === "topic_block")).toBe(true);
  });
});
