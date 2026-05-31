import { describe, expect, it } from "vitest";
import { getDomain, normalizeUrl, slugifyNodeName } from "@/lib/ingest/url";

describe("url helpers", () => {
  it("adds https to bare domains", () => {
    expect(normalizeUrl("example.com/a")).toBe("https://example.com/a");
  });

  it("removes www prefix from domains", () => {
    expect(getDomain("https://www.are.na/block/123")).toBe("are.na");
  });

  it("slugifies node names", () => {
    expect(slugifyNodeName("Personal Knowledge Management")).toBe("personal-knowledge-management");
  });
});
