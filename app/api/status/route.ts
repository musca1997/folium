import { requireApiAuth } from "@/lib/apiAuth";
import { libraryStore } from "@/lib/store/library";
import { getWorkerHeartbeat } from "@/lib/workerHeartbeat";

export async function GET(request: Request) {
  const unauthorized = await requireApiAuth(request);
  if (unauthorized) return unauthorized;
  const [summary, heartbeat] = await Promise.all([libraryStore.getJobSummary(), getWorkerHeartbeat()]);
  return Response.json({ ok: true, worker: heartbeat, jobs: summary });
}
