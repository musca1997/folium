import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLibraryStore } from "@/lib/store/library";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "folium-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("library store", () => {
  it("creates a pending URL block", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const block = await store.createUrlBlock("example.com/a");

    expect(block.status).toBe("pending");
    expect(block.url).toBe("https://example.com/a");
    expect(block.domain).toBe("example.com");
  });

  it("processes a block and links generated nodes", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const block = await store.createUrlBlock("https://www.are.na/block/123");

    const processed = await store.processBlock(block.id);
    const nodes = await store.listNodes();

    expect(processed.status).toBe("indexed");
    expect(processed.title).toContain("are.na");
    expect(processed.summary.length).toBeGreaterThan(0);
    expect(nodes.length).toBeGreaterThan(0);
    expect(processed.nodeLinks.length).toBeGreaterThan(0);
  });

  it("reuses nodes by slug while processing multiple blocks", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const first = await store.createUrlBlock("https://are.na/a");
    const second = await store.createUrlBlock("https://are.na/b");

    await store.processBlock(first.id);
    await store.processBlock(second.id);

    const nodes = await store.listNodes();
    const foliumNodes = nodes.filter((node) => node.slug === "are-na");
    expect(foliumNodes).toHaveLength(1);
  });

  it("preserves all blocks during concurrent creates", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    await Promise.all(Array.from({ length: 20 }, (_, index) => store.createUrlBlock(`https://example.com/${index}`)));

    expect(await store.listBlocks()).toHaveLength(20);
  });

  it("throws on corrupt library JSON instead of resetting data", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    await store.createUrlBlock("https://example.com/a");
    await writeFile(join(dir, "library.json"), "{ bad json", "utf8");

    await expect(store.listBlocks()).rejects.toThrow();
  });
});
