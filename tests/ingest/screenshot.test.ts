import { describe, expect, it } from "vitest";
import { screenshotPathForBlock } from "@/lib/ingest/screenshot";

describe("screenshotPathForBlock", () => {
  it("creates a protected screenshot route for a block", () => {
    expect(screenshotPathForBlock("blk_123")).toBe("/screenshots/blk_123");
  });
});
