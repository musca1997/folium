import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

type CapturedRequest = {
  method: string;
  path: string;
  authorization: string | undefined;
  body: unknown;
};

type JsonResponse = {
  status?: number;
  body: unknown;
};

type RouteHandler = (request: CapturedRequest) => JsonResponse;

let homeDir: string;

beforeEach(async () => {
  homeDir = await mkdtemp(join(tmpdir(), "folium-cli-"));
});

afterEach(async () => {
  await rm(homeDir, { recursive: true, force: true });
});

async function writeCliConfig(config: { url: string; token: string }) {
  const configDir = join(homeDir, ".config", "folium");
  await mkdir(configDir, { recursive: true });
  await writeFile(join(configDir, "config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : null;
}

async function withApiServer<T>(handler: RouteHandler, run: (baseUrl: string, requests: CapturedRequest[]) => Promise<T>): Promise<T> {
  const requests: CapturedRequest[] = [];
  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const captured: CapturedRequest = {
        method: request.method ?? "GET",
        path: request.url ?? "/",
        authorization: request.headers.authorization,
        body: await readJsonBody(request),
      };
      requests.push(captured);
      const result = handler(captured);
      response.statusCode = result.status ?? 200;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(result.body));
    } catch (error) {
      response.statusCode = 500;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    return await run(`http://127.0.0.1:${port}`, requests);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function runCli(args: string[]) {
  const child = spawn(process.execPath, ["./node_modules/.bin/tsx", "packages/cli/src/index.ts", ...args], {
    cwd: join(import.meta.dirname, "..", ".."),
    env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
  child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));

  const code = await new Promise<number | null>((resolve) => child.on("close", resolve));
  const stdout = Buffer.concat(stdoutChunks).toString("utf8");
  const stderr = Buffer.concat(stderrChunks).toString("utf8");
  return { code, stdout, stderr };
}

describe("folium CLI commands", () => {
  it("saves configuration and reports whether a token is configured", async () => {
    const setUrl = await runCli(["config", "set-url", "https://folium.test"]);
    const setToken = await runCli(["config", "set-token", "secret-token"]);
    const show = await runCli(["config", "show", "--json"]);

    expect(setUrl).toMatchObject({ code: 0, stderr: "" });
    expect(setUrl.stdout).toContain("Folium URL saved.");
    expect(setToken).toMatchObject({ code: 0, stderr: "" });
    expect(setToken.stdout).toContain("Folium API token saved.");

    expect(show).toMatchObject({ code: 0, stderr: "" });
    const config = JSON.parse(show.stdout) as { url: string; tokenConfigured: boolean; configPath: string };
    expect(config.url).toBe("https://folium.test");
    expect(config.tokenConfigured).toBe(true);
    expect(config.configPath).toContain(join(".config", "folium", "config.json"));
    expect(show.stdout).not.toContain("secret-token");
  });

  it("adds URLs as private by default and prints a concise human result", async () => {
    await withApiServer(
      (request) => {
        expect(request.method).toBe("POST");
        expect(request.path).toBe("/api/blocks");
        expect(request.authorization).toBe("Bearer cli-token");
        expect(request.body).toEqual({ url: "https://example.com/article", visibility: "private" });
        return { body: { created: true, duplicate: false, block: { id: "block-1", url: "https://example.com/article", title: "Example Article" } } };
      },
      async (baseUrl, requests) => {
        await writeCliConfig({ url: baseUrl, token: "cli-token" });
        const result = await runCli(["add", "https://example.com/article"]);

        expect(result).toMatchObject({ code: 0, stderr: "" });
        expect(result.stdout.trim()).toBe("Added: Example Article (block-1)");
        expect(requests).toHaveLength(1);
      },
    );
  });

  it("adds public URLs and preserves the API response in JSON mode", async () => {
    await withApiServer(
      (request) => {
        expect(request.body).toEqual({ url: "https://example.com/public", visibility: "public" });
        return { body: { created: false, duplicate: true, block: { id: "block-public", url: "https://example.com/public", title: "Public Link" } } };
      },
      async (baseUrl) => {
        await writeCliConfig({ url: baseUrl, token: "cli-token" });
        const result = await runCli(["add", "https://example.com/public", "--public", "--json"]);

        expect(result).toMatchObject({ code: 0, stderr: "" });
        expect(JSON.parse(result.stdout)).toEqual({
          created: false,
          duplicate: true,
          block: { id: "block-public", url: "https://example.com/public", title: "Public Link" },
        });
      },
    );
  });

  it("searches with an encoded query and prints JSON results", async () => {
    await withApiServer(
      (request) => {
        expect(request.method).toBe("GET");
        expect(request.path).toBe("/api/search?q=semantic%20memory");
        return { body: { results: [{ id: "block-2", title: "Semantic Memory" }] } };
      },
      async (baseUrl) => {
        await writeCliConfig({ url: baseUrl, token: "cli-token" });
        const result = await runCli(["search", "semantic", "memory", "--json"]);

        expect(result).toMatchObject({ code: 0, stderr: "" });
        expect(JSON.parse(result.stdout)).toEqual({ results: [{ id: "block-2", title: "Semantic Memory" }] });
      },
    );
  });

  it("gets a block as text from content fields", async () => {
    await withApiServer(
      (request) => {
        expect(request.method).toBe("GET");
        expect(request.path).toBe("/api/blocks/block-3");
        return { body: { block: { id: "block-3", title: "Stored Page", contentText: "Readable article text" } } };
      },
      async (baseUrl) => {
        await writeCliConfig({ url: baseUrl, token: "cli-token" });
        const result = await runCli(["get", "block-3", "--text"]);

        expect(result).toMatchObject({ code: 0, stderr: "" });
        expect(result.stdout.trim()).toBe("Readable article text");
      },
    );
  });

  it("extracts a URL with browser mode and prints extracted text", async () => {
    await withApiServer(
      (request) => {
        expect(request.method).toBe("POST");
        expect(request.path).toBe("/api/extract");
        expect(request.body).toEqual({ url: "https://example.com/read", browser: true });
        return { body: { extraction: { title: "Extracted", textContent: "Extracted page text" } } };
      },
      async (baseUrl) => {
        await writeCliConfig({ url: baseUrl, token: "cli-token" });
        const result = await runCli(["extract", "https://example.com/read", "--browser", "--text"]);

        expect(result).toMatchObject({ code: 0, stderr: "" });
        expect(result.stdout.trim()).toBe("Extracted page text");
      },
    );
  });

  it("sends curation commands to pin and visibility endpoints", async () => {
    const expected = [
      { path: "/api/blocks/block-4/pin", body: { pinned: true } },
      { path: "/api/blocks/block-4/visibility", body: { visibility: "public" } },
    ];

    await withApiServer(
      (request) => {
        const next = expected.shift();
        expect(next).toBeDefined();
        expect(request.method).toBe("POST");
        expect(request.path).toBe(next?.path);
        expect(request.body).toEqual(next?.body);
        return { body: { ok: true } };
      },
      async (baseUrl, requests) => {
        await writeCliConfig({ url: baseUrl, token: "cli-token" });
        const pin = await runCli(["pin", "block-4", "--json"]);
        const makePublic = await runCli(["public", "block-4", "--json"]);

        expect(pin).toMatchObject({ code: 0, stderr: "" });
        expect(makePublic).toMatchObject({ code: 0, stderr: "" });
        expect(JSON.parse(pin.stdout)).toEqual({ ok: true });
        expect(JSON.parse(makePublic.stdout)).toEqual({ ok: true });
        expect(requests).toHaveLength(2);
        expect(expected).toHaveLength(0);
      },
    );
  });
});
