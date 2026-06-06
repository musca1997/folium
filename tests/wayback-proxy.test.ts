import { describe, expect, it } from "vitest";
import { getProxyUrl } from "@/lib/ingest/wayback";

describe("Wayback proxy support", () => {
  it("uses HTTPS proxy settings when present", () => {
    const proxyUrl = getProxyUrl({ HTTPS_PROXY: "http://127.0.0.1:7890" });

    expect(proxyUrl).toBe("http://127.0.0.1:7890");
  });

  it("does not use a proxy without proxy settings", () => {
    const proxyUrl = getProxyUrl({});

    expect(proxyUrl).toBeUndefined();
  });
});
