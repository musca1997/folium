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

  it("does not claim the same job during concurrent claims", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const blockA = await store.createUrlBlock("example.com/a");
    const blockB = await store.createUrlBlock("example.com/b");
    await store.enqueueProcessBlock(blockA.id);
    await store.enqueueProcessBlock(blockB.id);

    const claims = await Promise.all([store.claimNextJob(), store.claimNextJob()]);
    const ids = claims.filter(Boolean).map((job) => job!.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(2);
  });

  it("reclaims stale running jobs before newer queued jobs", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false, staleJobTimeoutMs: 1 });
    const blockA = await store.createUrlBlock("example.com/a");
    const blockB = await store.createUrlBlock("example.com/b");
    const first = await store.enqueueProcessBlock(blockA.id);
    await store.claimNextJob();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await store.enqueueProcessBlock(blockB.id);

    const claimed = await store.claimNextJob();

    expect(claimed?.id).toBe(first.id);
    expect(claimed?.status).toBe("running");
    const jobs = await store.listJobs();
    expect(jobs.find((job) => job.blockId === blockB.id)?.status).toBe("queued");
  });

  it("requeues failed jobs below max attempts and preserves error history", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false, maxJobAttempts: 2 });
    const block = await store.createUrlBlock("example.com/a");
    await store.enqueueProcessBlock(block.id);
    const claimed = await store.claimNextJob();

    const failed = await store.markJobFailed(claimed!.id, "first failure");

    expect(failed.status).toBe("queued");
    expect(failed.error).toBe("first failure");
    expect(failed.lastError).toBe("first failure");
    expect(failed.errorHistory).toEqual([expect.objectContaining({ message: "first failure", attempt: 1 })]);
  });

  it("marks block failed after final job attempt", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false, maxJobAttempts: 1 });
    const block = await store.createUrlBlock("example.com/a");
    await store.enqueueProcessBlock(block.id);
    const claimed = await store.claimNextJob();

    const failed = await store.markJobFailed(claimed!.id, "final failure");
    const updated = await store.getBlock(block.id);

    expect(failed.status).toBe("failed");
    expect(updated?.status).toBe("failed");
  });
});
