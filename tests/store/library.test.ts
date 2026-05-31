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

  it("keeps block order stable when adding new URLs", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    const first = await store.createUrlBlock("https://example.com/first");
    const second = await store.createUrlBlock("https://example.com/second");
    const before = (await store.listBlocks()).map((block) => block.id);
    const third = await store.createUrlBlock("https://example.com/third");
    const after = (await store.listBlocks()).map((block) => block.id);

    expect(before).toEqual([second.id, first.id]);
    expect(after).toEqual([third.id, second.id, first.id]);
  });

  it("returns the existing block when adding a duplicate canonical URL", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    const first = await store.addUrlBlock("https://www.example.com/a?utm_source=newsletter");
    const second = await store.addUrlBlock("https://example.com/a");

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.block.id).toBe(first.block.id);
    expect(await store.listBlocks()).toHaveLength(1);
  });

  it("deduplicates concurrent equivalent URL adds", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    const results = await Promise.all(Array.from({ length: 20 }, () => store.addUrlBlock("https://example.com/a?utm_source=x")));

    expect(await store.listBlocks()).toHaveLength(1);
    expect(results.filter((result) => result.created)).toHaveLength(1);
  });

  it("stores manual content and queues analysis", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const block = await store.createUrlBlock("https://linux.do/t/example");

    const updated = await store.setManualContent(block.id, "Manual title", "This is manually pasted content about Linux, forums, and self-hosting.".repeat(8));
    const jobs = await store.listJobs();

    expect(updated.title).toBe("Manual title");
    expect(updated.contentText).toContain("manually pasted content");
    expect(updated.metadata.extractionMethod).toBe("manual");
    expect(updated.metadata.extractionBlockedReason).toBeUndefined();
    expect(updated.status).toBe("thinking");
    expect(jobs.some((job) => job.blockId === block.id && job.type === "analyze_block" && job.status === "queued")).toBe(true);
  });

  it("stores browser extension content with metadata and queues analysis", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const result = await store.addUrlBlock("https://linux.do/t/example");

    const updated = await store.setProvidedContent(result.block.id, {
      title: "Linux forum thread",
      description: "A clipped forum discussion.",
      contentText: "Clipped browser text about Linux, forums, and self-hosting.".repeat(8),
      contentHtml: "<article>Clipped browser text</article>",
      canonicalUrl: "https://linux.do/t/example",
      extractionMethod: "browser_extension",
    });
    const jobs = await store.listJobs();

    expect(updated.title).toBe("Linux forum thread");
    expect(updated.description).toBe("A clipped forum discussion.");
    expect(updated.contentHtml).toContain("article");
    expect(updated.metadata.canonicalUrl).toBe("https://linux.do/t/example");
    expect(updated.metadata.extractionMethod).toBe("browser_extension");
    expect(updated.status).toBe("thinking");
    expect(jobs.some((job) => job.blockId === result.block.id && job.type === "analyze_block" && job.status === "queued")).toBe(true);
  });
});
