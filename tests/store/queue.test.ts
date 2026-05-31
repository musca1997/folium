import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLibraryStore } from "@/lib/store/library";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "folium-queue-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("job queue", () => {
  it("enqueues a process_block job for a block", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const block = await store.createUrlBlock("example.com/a");

    const job = await store.enqueueProcessBlock(block.id);
    const jobs = await store.listJobs();

    expect(job.status).toBe("queued");
    expect(job.blockId).toBe(block.id);
    expect(jobs).toHaveLength(1);
  });

  it("claims the next queued job and marks it running", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const block = await store.createUrlBlock("example.com/a");
    await store.enqueueProcessBlock(block.id);

    const job = await store.claimNextJob();

    expect(job?.status).toBe("running");
    expect(job?.blockId).toBe(block.id);
  });

  it("runs one queued job and indexes the block", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const block = await store.createUrlBlock("example.com/a");
    await store.enqueueProcessBlock(block.id);

    const didWork = await store.runNextJob();
    const processed = await store.getBlock(block.id);
    const jobs = await store.listJobs();

    expect(didWork).toBe(true);
    expect(processed?.status).toBe("indexed");
    expect(jobs[0]?.status).toBe("done");
  });

  it("returns false when no queued jobs exist", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });

    await expect(store.runNextJob()).resolves.toBe(false);
  });
});
