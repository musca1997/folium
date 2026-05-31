import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const dataDir = join(process.cwd(), "data");
const backupDir = join(dataDir, "backups");
const libraryPath = join(dataDir, "library.json");

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function createLibraryBackup(): Promise<string> {
  await mkdir(backupDir, { recursive: true });
  const raw = await readFile(libraryPath, "utf8");
  JSON.parse(raw);
  const name = `library-${timestamp()}.json`;
  await writeFile(join(backupDir, name), raw, "utf8");
  return name;
}

export async function listLibraryBackups(): Promise<Array<{ name: string; createdAt: string }>> {
  try {
    const entries = await readdir(backupDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => ({ name: entry.name, createdAt: entry.name.replace(/^library-/, "").replace(/\.json$/, "") }))
      .sort((a, b) => b.name.localeCompare(a.name));
  } catch {
    return [];
  }
}

export async function restoreLibraryBackup(name: string): Promise<void> {
  const safeName = basename(name);
  if (!safeName.endsWith(".json")) throw new Error("Invalid backup name");
  const raw = await readFile(join(backupDir, safeName), "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.blocks) || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.topics) || !Array.isArray(parsed.jobs)) throw new Error("Invalid library backup");
  await createLibraryBackup();
  await writeFile(libraryPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}
