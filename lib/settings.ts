import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const settingsPath = join(process.cwd(), "data", "settings.json");

export type AiSettings = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  updatedAt?: string;
};

export type ApiTokenRecord = {
  id: string;
  label: string;
  tokenHash: string;
  createdAt: string;
  lastUsedAt?: string;
};

export type ApiSettings = {
  tokenHash?: string;
  tokens?: ApiTokenRecord[];
  updatedAt?: string;
};

export type AppSettings = {
  ai: AiSettings;
  api: ApiSettings;
};

const defaultSettings: AppSettings = { ai: {}, api: {} };
let testSettings: AppSettings = { ai: {}, api: {} };

function normalizeApiSettings(api: ApiSettings | undefined): ApiSettings {
  const tokens = [...(api?.tokens ?? [])];
  if (api?.tokenHash && !tokens.some((token) => token.tokenHash === api.tokenHash)) {
    tokens.push({ id: "legacy", label: "Legacy token", tokenHash: api.tokenHash, createdAt: api.updatedAt ?? new Date().toISOString() });
  }
  return { ...api, tokens };
}

export async function getSettings(): Promise<AppSettings> {
  if (process.env.VITEST) return { ai: { ...testSettings.ai }, api: normalizeApiSettings(testSettings.api) };
  try {
    const parsed = JSON.parse(await readFile(settingsPath, "utf8")) as Partial<AppSettings>;
    return { ai: { ...(parsed.ai ?? {}) }, api: normalizeApiSettings(parsed.api) };
  } catch {
    return defaultSettings;
  }
}

export async function getAiSettings(): Promise<AiSettings> {
  return (await getSettings()).ai;
}

async function writeSettings(settings: AppSettings): Promise<void> {
  if (process.env.VITEST) {
    testSettings = settings;
    return;
  }
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export async function updateAiSettings(input: { apiKey?: string; baseUrl?: string; model?: string; clearApiKey?: boolean }): Promise<AppSettings> {
  const current = await getSettings();
  const apiKeyInput = input.apiKey?.trim();
  const next: AppSettings = {
    ...current,
    ai: {
      ...current.ai,
      baseUrl: input.baseUrl?.trim() || undefined,
      model: input.model?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    },
  };
  if (input.clearApiKey) delete next.ai.apiKey;
  if (apiKeyInput) next.ai.apiKey = apiKeyInput;
  await writeSettings(next);
  return next;
}

export async function updateApiSettings(input: { tokenHash?: string | null; updatedAt?: string }): Promise<AppSettings> {
  const current = await getSettings();
  const next: AppSettings = { ...current, api: { ...current.api, updatedAt: input.updatedAt ?? new Date().toISOString() } };
  if (input.tokenHash === null) {
    delete next.api.tokenHash;
    next.api.tokens = [];
  } else if (input.tokenHash) {
    next.api.tokenHash = input.tokenHash;
    next.api.tokens = [{ id: "legacy", label: "Legacy token", tokenHash: input.tokenHash, createdAt: next.api.updatedAt ?? new Date().toISOString() }];
  }
  await writeSettings(next);
  return next;
}

export async function addApiTokenRecord(record: ApiTokenRecord): Promise<AppSettings> {
  const current = await getSettings();
  const next: AppSettings = {
    ...current,
    api: {
      ...current.api,
      tokens: [...(current.api.tokens ?? []).filter((token) => token.id !== "legacy" || current.api.tokenHash), record],
      updatedAt: new Date().toISOString(),
    },
  };
  await writeSettings(next);
  return next;
}

export async function removeApiTokenRecord(id: string): Promise<AppSettings> {
  const current = await getSettings();
  const next: AppSettings = { ...current, api: { ...current.api, tokens: (current.api.tokens ?? []).filter((token) => token.id !== id), updatedAt: new Date().toISOString() } };
  if (id === "legacy") delete next.api.tokenHash;
  await writeSettings(next);
  return next;
}

export async function markApiTokenUsed(id: string): Promise<void> {
  const current = await getSettings();
  const tokens = current.api.tokens ?? [];
  const token = tokens.find((item) => item.id === id);
  if (!token) return;
  token.lastUsedAt = new Date().toISOString();
  await writeSettings({ ...current, api: { ...current.api, tokens, updatedAt: current.api.updatedAt } });
}
