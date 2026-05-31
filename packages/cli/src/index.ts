#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const configPath = join(homedir(), ".config", "folium", "config.json");

type Config = { url?: string; token?: string };
type CliOptions = { json: boolean; wait: boolean; public: boolean; private: boolean; text: boolean; browser: boolean };

async function readConfig(): Promise<Config> {
  try { return JSON.parse(await readFile(configPath, "utf8")) as Config; } catch { return {}; }
}

async function writeConfig(config: Config): Promise<void> {
  await mkdir(join(homedir(), ".config", "folium"), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  const opts: CliOptions = { json: false, wait: false, public: false, private: false, text: false, browser: false };
  const args: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const item = rest[i];
    if (item === "--json") opts.json = true;
    else if (item === "--wait") opts.wait = true;
    else if (item === "--public") opts.public = true;
    else if (item === "--private") opts.private = true;
    else if (item === "--text") opts.text = true;
    else if (item === "--browser") opts.browser = true;
    else args.push(item);
  }
  return { command, args, opts };
}

function print(value: unknown, opts: CliOptions) {
  if (opts.json) console.log(JSON.stringify(value, null, 2));
  else if (typeof value === "string") console.log(value);
  else console.log(JSON.stringify(value, null, 2));
}

async function request(path: string, init: RequestInit = {}) {
  const config = await readConfig();
  if (!config.url || !config.token) throw new Error("Folium CLI is not configured. Run: folium config set-url <url> && folium config set-token <token>");
  const base = config.url.replace(/\/$/, "");
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.token}`,
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.error || `Request failed: ${response.status}`);
  return data;
}

async function waitForBlock(id: string, timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const data = await request(`/api/blocks/${encodeURIComponent(id)}`);
    const status = data.block?.status;
    if (status === "indexed" || status === "failed") return data;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return request(`/api/blocks/${encodeURIComponent(id)}`);
}

async function runMcpServer() {
  process.stdin.setEncoding("utf8");
  let buffer = "";
  process.stdin.on("data", async (chunk) => {
    buffer += chunk;
    let index: number;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      let message: any;
      try { message = JSON.parse(line); } catch { continue; }
      const id = message.id;
      try {
        let result: unknown;
        if (message.method === "initialize") {
          result = { protocolVersion: "2024-11-05", serverInfo: { name: "folium", version: "0.1.0" }, capabilities: { tools: {} } };
        } else if (message.method === "tools/list") {
          result = { tools: [
            { name: "folium_status", description: "Get Folium worker and job status", inputSchema: { type: "object", properties: {} } },
            { name: "folium_search", description: "Search saved Folium references", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
            { name: "folium_add", description: "Save a URL to Folium", inputSchema: { type: "object", properties: { url: { type: "string" }, visibility: { type: "string", enum: ["private", "public"] }, wait: { type: "boolean" } }, required: ["url"] } },
            { name: "folium_get", description: "Get a Folium block", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
            { name: "folium_extract", description: "Extract a URL without saving it", inputSchema: { type: "object", properties: { url: { type: "string" }, browser: { type: "boolean" } }, required: ["url"] } }
          ] };
        } else if (message.method === "tools/call") {
          const name = message.params?.name;
          const input = message.params?.arguments ?? {};
          let data: unknown;
          if (name === "folium_status") data = await request("/api/status");
          else if (name === "folium_search") data = await request(`/api/search?q=${encodeURIComponent(String(input.query ?? ""))}`);
          else if (name === "folium_add") {
            const added = await request("/api/blocks", { method: "POST", body: JSON.stringify({ url: input.url, visibility: input.visibility === "public" ? "public" : "private" }) });
            data = input.wait && added.created ? { ...(await waitForBlock(added.block.id)), created: added.created, duplicate: added.duplicate } : added;
          } else if (name === "folium_get") data = await request(`/api/blocks/${encodeURIComponent(String(input.id))}`);
          else if (name === "folium_extract") data = await request("/api/extract", { method: "POST", body: JSON.stringify({ url: input.url, browser: Boolean(input.browser) }) });
          else throw new Error(`Unknown tool: ${name}`);
          result = { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        } else {
          result = {};
        }
        if (id !== undefined) process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
      } catch (error) {
        if (id !== undefined) process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32000, message: error instanceof Error ? error.message : String(error) } })}\n`);
      }
    }
  });
}

async function main() {
  const { command, args, opts } = parseArgs(process.argv.slice(2));
  if (!command || command === "help" || command === "--help") {
    console.log(`folium <command>\n\nCommands:\n  config show|set-url|set-token\n  status [--json]\n  add <url> [--private|--public] [--wait] [--json]\n  search <query> [--json]\n  get <block-id> [--json|--text]\n  pin|unpin <block-id> [--json]\n  public|private <block-id> [--json]\n  extract <url> [--browser] [--json|--text]\n  mcp`);
    return;
  }

  if (command === "config") {
    const [sub, value] = args;
    const config = await readConfig();
    if (sub === "show") print({ url: config.url, tokenConfigured: Boolean(config.token), configPath }, opts);
    else if (sub === "set-url") { if (!value) throw new Error("Missing URL"); await writeConfig({ ...config, url: value }); print("Folium URL saved.", opts); }
    else if (sub === "set-token") { if (!value) throw new Error("Missing token"); await writeConfig({ ...config, token: value }); print("Folium API token saved.", opts); }
    else throw new Error("Unknown config command");
    return;
  }

  if (command === "status") {
    print(await request("/api/status"), opts);
    return;
  }

  if (command === "add") {
    const url = args[0];
    if (!url) throw new Error("Missing URL");
    const visibility = opts.public ? "public" : "private";
    const data = await request("/api/blocks", { method: "POST", body: JSON.stringify({ url, visibility }) });
    const result = opts.wait && data.created ? { ...(await waitForBlock(data.block.id)), created: data.created, duplicate: data.duplicate } : data;
    if (!opts.json && !opts.text) {
      const block = result.block ?? data.block;
      print(`${result.duplicate ? "Already saved" : "Added"}: ${block.title || block.url} (${block.id})`, opts);
    } else print(result, opts);
    return;
  }

  if (command === "search") {
    const query = args.join(" ").trim();
    if (!query) throw new Error("Missing query");
    print(await request(`/api/search?q=${encodeURIComponent(query)}`), opts);
    return;
  }

  if (command === "get") {
    const id = args[0];
    if (!id) throw new Error("Missing block id");
    const data = await request(`/api/blocks/${encodeURIComponent(id)}`);
    print(opts.text ? data.block.contentText || data.block.summary || data.block.description || "" : data, opts);
    return;
  }

  if (command === "pin" || command === "unpin") {
    const id = args[0];
    if (!id) throw new Error("Missing block id");
    print(await request(`/api/blocks/${encodeURIComponent(id)}/pin`, { method: "POST", body: JSON.stringify({ pinned: command === "pin" }) }), opts);
    return;
  }

  if (command === "public" || command === "private") {
    const id = args[0];
    if (!id) throw new Error("Missing block id");
    print(await request(`/api/blocks/${encodeURIComponent(id)}/visibility`, { method: "POST", body: JSON.stringify({ visibility: command }) }), opts);
    return;
  }

  if (command === "extract") {
    const url = args[0];
    if (!url) throw new Error("Missing URL");
    const data = await request("/api/extract", { method: "POST", body: JSON.stringify({ url, browser: opts.browser }) });
    print(opts.text ? data.extraction?.textContent || "" : data, opts);
    return;
  }

  if (command === "mcp") {
    await runMcpServer();
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
