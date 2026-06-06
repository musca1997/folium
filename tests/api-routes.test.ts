import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertSafePublicUrl: vi.fn(async (input: string) => new URL(input).toString()),
  fetchAndExtractPage: vi.fn(),
  browserExtractPage: vi.fn(),
}));

vi.mock("@/lib/security/urlSafety", () => ({
  assertSafePublicUrl: mocks.assertSafePublicUrl,
}));

vi.mock("@/lib/ingest/extract", () => ({
  fetchAndExtractPage: mocks.fetchAndExtractPage,
}));

vi.mock("@/lib/ingest/browserExtract", () => ({
  browserExtractPage: mocks.browserExtractPage,
}));

let dir: string;
let originalCwd: string;
let token: string;

function apiRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
  return new Request(`https://folium.test${path}`, { ...init, headers });
}

function jsonRequest(path: string, body: unknown, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  return apiRequest(path, { ...init, method: init.method ?? "POST", headers, body: JSON.stringify(body) });
}

async function readJson(response: Response) {
  return await response.json() as Record<string, any>;
}

beforeEach(async () => {
  originalCwd = process.cwd();
  dir = await mkdtemp(join(tmpdir(), "folium-api-routes-"));
  process.chdir(dir);
  await mkdir("data", { recursive: true });
  vi.resetModules();
  vi.clearAllMocks();
  mocks.assertSafePublicUrl.mockImplementation(async (input: string) => new URL(input).toString());
  const { generateApiToken, revokeApiToken } = await import("@/lib/apiAuth");
  await revokeApiToken();
  token = (await generateApiToken("API route tests")).token;
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(dir, { recursive: true, force: true });
});

describe("Next API routes", () => {
  it("requires bearer token auth before returning status", async () => {
    const route = await import("@/app/api/status/route");

    const unauthorized = await route.GET(new Request("https://folium.test/api/status"));
    const authorized = await route.GET(apiRequest("/api/status"));

    expect(unauthorized.status).toBe(401);
    expect(await readJson(unauthorized)).toEqual({ error: "unauthorized" });
    expect(authorized.status).toBe(200);
    expect(await readJson(authorized)).toMatchObject({ ok: true, jobs: { queued: 0, running: 0, failed: 0 } });
  });

  it("creates private blocks, rejects bad input, and searches created blocks", async () => {
    const blocksRoute = await import("@/app/api/blocks/route");
    const searchRoute = await import("@/app/api/search/route");

    const missing = await blocksRoute.POST(jsonRequest("/api/blocks", {}));
    expect(missing.status).toBe(400);
    expect(await readJson(missing)).toMatchObject({ error: "missing_url" });

    const created = await blocksRoute.POST(jsonRequest("/api/blocks", { url: "https://example.com/articles/one" }));
    const createdBody = await readJson(created);
    expect(created.status).toBe(201);
    expect(createdBody).toMatchObject({ created: true, duplicate: false, block: { url: "https://example.com/articles/one", visibility: "private", status: "pending" } });

    const duplicate = await blocksRoute.POST(jsonRequest("/api/blocks", { url: "https://example.com/articles/one", visibility: "public" }));
    expect(duplicate.status).toBe(200);
    expect(await readJson(duplicate)).toMatchObject({ created: false, duplicate: true, block: { id: createdBody.block.id, visibility: "private" } });

    const search = await searchRoute.GET(apiRequest("/api/search?q=articles"));
    const searchBody = await readJson(search);
    expect(search.status).toBe(200);
    expect(searchBody.query).toBe("articles");
    expect(searchBody.blocks.map((block: { id: string }) => block.id)).toContain(createdBody.block.id);
  });

  it("returns block details and updates visibility and pin state", async () => {
    const blocksRoute = await import("@/app/api/blocks/route");
    const detailRoute = await import("@/app/api/blocks/[id]/route");
    const visibilityRoute = await import("@/app/api/blocks/[id]/visibility/route");
    const pinRoute = await import("@/app/api/blocks/[id]/pin/route");

    const created = await readJson(await blocksRoute.POST(jsonRequest("/api/blocks", { url: "https://example.com/details" })));
    const params = { params: Promise.resolve({ id: created.block.id as string }) };

    const detail = await detailRoute.GET(apiRequest(`/api/blocks/${created.block.id}`), params);
    expect(detail.status).toBe(200);
    expect(await readJson(detail)).toMatchObject({ block: { id: created.block.id, contentText: "", jobs: [{ type: "process_block", status: "queued" }] } });

    const invalidVisibility = await visibilityRoute.POST(jsonRequest(`/api/blocks/${created.block.id}/visibility`, { visibility: "friends" }), params);
    expect(invalidVisibility.status).toBe(400);
    expect(await readJson(invalidVisibility)).toEqual({ error: "invalid_visibility" });

    const visible = await visibilityRoute.POST(jsonRequest(`/api/blocks/${created.block.id}/visibility`, { visibility: "public" }), params);
    expect(visible.status).toBe(200);
    expect(await readJson(visible)).toMatchObject({ block: { id: created.block.id, visibility: "public" } });

    const pinned = await pinRoute.POST(jsonRequest(`/api/blocks/${created.block.id}/pin`, { pinned: true }), params);
    expect(pinned.status).toBe(200);
    expect(await readJson(pinned)).toMatchObject({ block: { id: created.block.id, pinned: true } });

    const unpinned = await pinRoute.POST(jsonRequest(`/api/blocks/${created.block.id}/pin`, { pinned: false }), params);
    expect(unpinned.status).toBe(200);
    expect(await readJson(unpinned)).toMatchObject({ block: { id: created.block.id, pinned: false } });
  });

  it("handles browser clip CORS, auth, validation, and stored clipped content", async () => {
    const route = await import("@/app/api/clip/route");

    const options = route.OPTIONS();
    expect(options.status).toBe(204);
    expect(options.headers.get("access-control-allow-origin")).toBe("*");

    const unauthorized = await route.POST(new Request("https://folium.test/api/clip", { method: "POST" }));
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("access-control-allow-origin")).toBe("*");
    expect(await readJson(unauthorized)).toEqual({ error: "unauthorized" });

    const shortContent = await route.POST(jsonRequest("/api/clip", { url: "https://example.com/clip", contentText: "too short" }));
    expect(shortContent.status).toBe(400);
    expect(await readJson(shortContent)).toEqual({ error: "content_too_short" });

    const clipped = await route.POST(jsonRequest("/api/clip", {
      url: "https://example.com/clip",
      title: "Clipped page",
      description: "Clipped description",
      contentText: "This clipped page has enough useful text for route validation.",
      htmlContent: "<article>Useful text</article>",
      visibility: "public",
    }));
    const clippedBody = await readJson(clipped);
    expect(clipped.status).toBe(201);
    expect(clipped.headers.get("access-control-allow-origin")).toBe("*");
    expect(clippedBody).toMatchObject({ created: true, queued: true, block: { title: "Clipped page", visibility: "public", status: "thinking" } });
  });

  it("extracts through fetch when content is sufficient and falls back to browser extraction", async () => {
    const route = await import("@/app/api/extract/route");
    const fetchExtraction = { title: "Fetch result", textContent: "f".repeat(300), contentHtml: "<p>fetch</p>" };
    const browserExtraction = { title: "Browser result", textContent: "browser extracted text", contentHtml: "<p>browser</p>" };

    mocks.fetchAndExtractPage.mockResolvedValueOnce(fetchExtraction);
    const fetchResponse = await route.POST(jsonRequest("/api/extract", { url: "https://example.com/fetch" }));
    expect(fetchResponse.status).toBe(200);
    expect(await readJson(fetchResponse)).toEqual({ method: "fetch", extraction: fetchExtraction });
    expect(mocks.browserExtractPage).not.toHaveBeenCalled();

    mocks.fetchAndExtractPage.mockRejectedValueOnce(new Error("fetch failed"));
    mocks.browserExtractPage.mockResolvedValueOnce(browserExtraction);
    const browserResponse = await route.POST(jsonRequest("/api/extract", { url: "https://example.com/browser" }));
    expect(browserResponse.status).toBe(200);
    expect(await readJson(browserResponse)).toEqual({ method: "browser", extraction: browserExtraction, fetchError: "fetch failed" });

    mocks.browserExtractPage.mockRejectedValueOnce(new Error("browser failed"));
    const failed = await route.POST(jsonRequest("/api/extract", { url: "https://example.com/browser-only", browser: true }));
    expect(failed.status).toBe(502);
    expect(await readJson(failed)).toEqual({ error: "extract_failed", fetchError: null, browserError: "browser failed" });
  });

  it("maps URL safety failures to unsafe_url responses", async () => {
    mocks.assertSafePublicUrl.mockRejectedValueOnce(new Error("Localhost URLs are not allowed"));
    const route = await import("@/app/api/blocks/route");

    const response = await route.POST(jsonRequest("/api/blocks", { url: "http://localhost:3000" }));

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({ error: "unsafe_url", message: "Localhost URLs are not allowed" });
  });
});
