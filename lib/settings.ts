import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const settingsPath = join(process.cwd(), "data", "settings.json");

export type AiSettings = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  updatedAt?: string;
};

export type ApiSettings = {
  tokenHash?: string;
  updatedAt?: string;
};

export type AppSettings = {
  ai: AiSettings;
  api: ApiSettings;
};

const defaultSettings: AppSettings = { ai: {}, api: {} };

export async function getSettings(): Promise<AppSettings> {
  if (process.env.VITEST) return defaultSettings;
  try {
    const parsed = JSON.parse(await readFile(settingsPath, "utf8")) as Partial<AppSettings>;
    return { ai: { ...(parsed.ai ?? {}) }, api: { ...(parsed.api ?? {}) } };
  } catch {
    return defaultSettings;
  }
}

export async function getAiSettings(): Promise<AiSettings> {
  return (await getSettings()).ai;
}

async function writeSettings(settings: AppSettings): Promise<void> {
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
  if (input.tokenHash === null) delete next.api.tokenHash;
  else if (input.tokenHash) next.api.tokenHash = input.tokenHash;
  await writeSettings(next);
  return next;
}
