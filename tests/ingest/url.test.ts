import { describe, expect, it } from "vitest";
import { canonicalizeUrl, getDomain, getUrlDuplicateKey, normalizeUrl, slugifyNodeName } from "@/lib/ingest/url";

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

  it("canonicalizes URLs for duplicate detection", () => {
    expect(canonicalizeUrl("HTTPS://Example.com/a/?utm_source=x&utm_medium=y#frag")).toBe("https://example.com/a");
    expect(canonicalizeUrl("https://example.com/a?fbclid=abc&x=1")).toBe("https://example.com/a?x=1");
    expect(canonicalizeUrl("example.com/a?b=2&a=1")).toBe("https://example.com/a?a=1&b=2");
  });

  it("uses a www-insensitive duplicate key", () => {
    expect(getUrlDuplicateKey("https://www.example.com/a?utm_campaign=x")).toBe(getUrlDuplicateKey("https://example.com/a"));
  });
});
