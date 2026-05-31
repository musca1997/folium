import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const path = join(process.cwd(), "data", "login-rate-limit.json");
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

type Entry = { failures: number; firstFailureAt: number; lockedUntil: number | null };
type Store = Record<string, Entry>;

async function readStore(): Promise<Store> {
  try { return JSON.parse(await readFile(path, "utf8")) as Store; } catch { return {}; }
}

async function writeStore(store: Store): Promise<void> {
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(path, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function isLoginLimited(key: string): Promise<boolean> {
  const store = await readStore();
  const entry = store[key];
  if (!entry) return false;
  const now = Date.now();
  if (entry.lockedUntil && entry.lockedUntil > now) return true;
  if (now - entry.firstFailureAt > WINDOW_MS) {
    delete store[key];
    await writeStore(store);
  }
  return false;
}

export async function recordLoginFailure(key: string): Promise<void> {
  const store = await readStore();
  const now = Date.now();
  const current = store[key];
  const entry = !current || now - current.firstFailureAt > WINDOW_MS ? { failures: 0, firstFailureAt: now, lockedUntil: null } : current;
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) entry.lockedUntil = now + WINDOW_MS;
  store[key] = entry;
  await writeStore(store);
}

export async function clearLoginFailures(key: string): Promise<void> {
  const store = await readStore();
  if (store[key]) {
    delete store[key];
    await writeStore(store);
  }
}
