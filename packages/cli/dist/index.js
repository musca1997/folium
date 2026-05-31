#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
const configPath = join(homedir(), ".config", "folium", "config.json");
async function readConfig() {
    try {
        return JSON.parse(await readFile(configPath, "utf8"));
    }
    catch {
        return {};
    }
}
async function writeConfig(config) {
    await mkdir(join(homedir(), ".config", "folium"), { recursive: true });
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}
function parseArgs(argv) {
    const [command, ...rest] = argv;
    const opts = { json: false, wait: false, public: false, private: false, text: false };
    const args = [];
    for (let i = 0; i < rest.length; i++) {
        const item = rest[i];
        if (item === "--json")
            opts.json = true;
        else if (item === "--wait")
            opts.wait = true;
        else if (item === "--public")
            opts.public = true;
        else if (item === "--private")
            opts.private = true;
        else if (item === "--text")
            opts.text = true;
        else
            args.push(item);
    }
    return { command, args, opts };
}
function print(value, opts) {
    if (opts.json)
        console.log(JSON.stringify(value, null, 2));
    else if (typeof value === "string")
        console.log(value);
    else
        console.log(JSON.stringify(value, null, 2));
}
async function request(path, init = {}) {
    const config = await readConfig();
    if (!config.url || !config.token)
        throw new Error("Folium CLI is not configured. Run: folium config set-url <url> && folium config set-token <token>");
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
    if (!response.ok)
        throw new Error(data?.message || data?.error || `Request failed: ${response.status}`);
    return data;
}
async function waitForBlock(id, timeoutMs = 120_000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        const data = await request(`/api/blocks/${encodeURIComponent(id)}`);
        const status = data.block?.status;
        if (status === "indexed" || status === "failed")
            return data;
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return request(`/api/blocks/${encodeURIComponent(id)}`);
}
async function main() {
    const { command, args, opts } = parseArgs(process.argv.slice(2));
    if (!command || command === "help" || command === "--help") {
        console.log(`folium <command>\n\nCommands:\n  config show|set-url|set-token\n  status [--json]\n  add <url> [--private|--public] [--wait] [--json]\n  search <query> [--json]\n  get <block-id> [--json|--text]`);
        return;
    }
    if (command === "config") {
        const [sub, value] = args;
        const config = await readConfig();
        if (sub === "show")
            print({ url: config.url, tokenConfigured: Boolean(config.token), configPath }, opts);
        else if (sub === "set-url") {
            if (!value)
                throw new Error("Missing URL");
            await writeConfig({ ...config, url: value });
            print("Folium URL saved.", opts);
        }
        else if (sub === "set-token") {
            if (!value)
                throw new Error("Missing token");
            await writeConfig({ ...config, token: value });
            print("Folium API token saved.", opts);
        }
        else
            throw new Error("Unknown config command");
        return;
    }
    if (command === "status") {
        print(await request("/api/status"), opts);
        return;
    }
    if (command === "add") {
        const url = args[0];
        if (!url)
            throw new Error("Missing URL");
        const visibility = opts.public ? "public" : "private";
        const data = await request("/api/blocks", { method: "POST", body: JSON.stringify({ url, visibility }) });
        const result = opts.wait ? await waitForBlock(data.block.id) : data;
        print(result, opts);
        return;
    }
    if (command === "search") {
        const query = args.join(" ").trim();
        if (!query)
            throw new Error("Missing query");
        print(await request(`/api/search?q=${encodeURIComponent(query)}`), opts);
        return;
    }
    if (command === "get") {
        const id = args[0];
        if (!id)
            throw new Error("Missing block id");
        const data = await request(`/api/blocks/${encodeURIComponent(id)}`);
        print(opts.text ? data.block.contentText || data.block.summary || data.block.description || "" : data, opts);
        return;
    }
    throw new Error(`Unknown command: ${command}`);
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
