import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLibraryStore } from "@/lib/store/library";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "folium-jobs-view-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("jobs view", () => {
  it("lists jobs with their related block", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const block = await store.createUrlBlock("example.com/a");
    const job = await store.enqueueProcessBlock(block.id);

    const jobs = await store.listJobsWithBlocks();

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.job.id).toBe(job.id);
    expect(jobs[0]?.block?.id).toBe(block.id);
    expect(jobs[0]?.block?.domain).toBe("example.com");
  });

  it("summarizes job status counts", async () => {
    const store = createLibraryStore({ dataDir: dir, enableNetwork: false });
    const block = await store.createUrlBlock("example.com/a");
    await store.enqueueProcessBlock(block.id);

    const summary = await store.getJobSummary();

    expect(summary).toEqual({ queued: 1, running: 0, done: 0, failed: 0 });
  });
});
