import { describe, expect, it } from "vitest";
import { randomBlockPath, serendipityRedirect } from "@/app/serendipity/route";
import type { Block } from "@/lib/store/types";

function block(id: string): Block {
  return {
    id,
    type: "url",
    url: `https://example.com/${id}`,
    domain: "example.com",
    title: id,
    summary: "",
    summaryTranslations: {},
    contentText: "",
    contentHtml: "",
    status: "indexed",
    screenshotPath: null,
    previewImage: null,
    favicon: null,
    description: "",
    metadata: {},
    visibility: "private",
    nodeLinks: [],
    topicLinks: [],
    createdAt: "now",
    updatedAt: "now",
  };
}

describe("Serendipity route helpers", () => {
  it("builds a block path from a deterministic random value", () => {
    expect(randomBlockPath([block("first"), block("second"), block("third")], () => 0.5)).toBe("/blocks/second");
  });

  it("returns the home path when there are no blocks", () => {
    expect(randomBlockPath([], () => 0.5)).toBe("/");
  });

  it("redirects with a relative Location so deployments keep their own domain", () => {
    const response = serendipityRedirect("/blocks/blk_1");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/blocks/blk_1");
  });
});
