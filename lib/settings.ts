import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const settingsPath = join(process.cwd(), "data", "settings.json");

export type AiSettings = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  updatedAt?: string;
};

export type AppSettings = {
  ai: AiSettings;
};

const defaultSettings: AppSettings = { ai: {} };

export async function getSettings(): Promise<AppSettings> {
  if (process.env.VITEST) return defaultSettings;
  try {
    const parsed = JSON.parse(await readFile(settingsPath, "utf8")) as Partial<AppSettings>;
    return { ai: { ...(parsed.ai ?? {}) } };
  } catch {
    return defaultSettings;
  }
}

export async function getAiSettings(): Promise<AiSettings> {
  return (await getSettings()).ai;
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
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}
