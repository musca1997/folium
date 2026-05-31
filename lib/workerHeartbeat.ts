import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const heartbeatPath = join(process.cwd(), "data", "worker-heartbeat.json");
const ONLINE_AFTER_MS = 15_000;

export type WorkerHeartbeat = {
  pid: number;
  updatedAt: string;
  intervalMs: number;
};

export async function writeWorkerHeartbeat(intervalMs: number): Promise<void> {
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  const heartbeat: WorkerHeartbeat = { pid: process.pid, updatedAt: new Date().toISOString(), intervalMs };
  await writeFile(heartbeatPath, `${JSON.stringify(heartbeat, null, 2)}\n`, "utf8");
}

export async function getWorkerHeartbeat(): Promise<(WorkerHeartbeat & { online: boolean; ageMs: number }) | null> {
  try {
    const heartbeat = JSON.parse(await readFile(heartbeatPath, "utf8")) as WorkerHeartbeat;
    const ageMs = Date.now() - Date.parse(heartbeat.updatedAt);
    return { ...heartbeat, ageMs, online: ageMs >= 0 && ageMs <= Math.max(ONLINE_AFTER_MS, heartbeat.intervalMs * 3) };
  } catch {
    return null;
  }
}
