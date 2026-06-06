import { describe, expect, it } from "vitest";
import { checkWaybackAvailability, submitToWayback } from "@/lib/ingest/wayback";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });
}

describe("Wayback integration", () => {
  it("returns an available snapshot from the availability API", async () => {
    const requests: string[] = [];
    const fetcher: typeof fetch = async (input) => {
      requests.push(String(input));
      return jsonResponse({
        archived_snapshots: {
          closest: {
            available: true,
            url: "https://web.archive.org/web/20240601000000/https://example.com/",
            timestamp: "20240601000000",
            status: "200",
          },
        },
      });
    };

    const result = await checkWaybackAvailability("https://example.com/", { fetcher });

    expect(result).toMatchObject({
      status: "available",
      url: "https://web.archive.org/web/20240601000000/https://example.com/",
      timestamp: "20240601000000",
      source: "availability",
    });
    expect(result.checkedAt).toEqual(expect.any(String));
    expect(requests[0]).toBe("https://archive.org/wayback/available?url=https%3A%2F%2Fexample.com%2F");
  });

  it("reports missing when no available snapshot exists", async () => {
    const result = await checkWaybackAvailability("https://example.com/missing", {
      fetcher: async () => jsonResponse({ archived_snapshots: {} }),
    });

    expect(result).toMatchObject({ status: "missing", source: "availability" });
    expect(result.url).toBeUndefined();
  });

  it("treats a Save Page Now edge error as submitted after checking availability", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async (input) => {
      calls += 1;
      const url = String(input);
      if (url.startsWith("https://web.archive.org/save/")) {
        return new Response("", { status: 523 });
      }
      return jsonResponse({ archived_snapshots: {} });
    };

    const result = await submitToWayback("https://example.com/flaky", { fetcher, waitMs: 0 });

    expect(calls).toBe(2);
    expect(result).toMatchObject({
      status: "submitted",
      source: "save_page_now",
      error: "Wayback Save Page Now returned 523. Capture may still be queued by archive.org.",
    });
  });

  it("submits a missing page and returns the newly available snapshot", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async (input) => {
      calls += 1;
      const url = String(input);
      if (url.startsWith("https://web.archive.org/save/")) {
        return new Response("", { status: 200 });
      }
      return jsonResponse({
        archived_snapshots: {
          closest: {
            available: true,
            url: "https://web.archive.org/web/20240602000000/https://example.com/new",
            timestamp: "20240602000000",
            status: "200",
          },
        },
      });
    };

    const result = await submitToWayback("https://example.com/new", { fetcher, waitMs: 0 });

    expect(calls).toBe(2);
    expect(result).toMatchObject({
      status: "available",
      url: "https://web.archive.org/web/20240602000000/https://example.com/new",
      timestamp: "20240602000000",
      source: "save_page_now",
    });
    expect(result.submittedAt).toEqual(expect.any(String));
  });
});
