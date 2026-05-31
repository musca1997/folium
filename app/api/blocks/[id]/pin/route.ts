import { notFound } from "next/navigation";
import { requireApiAuth } from "@/lib/apiAuth";
import { serializeBlockDetail } from "@/lib/api/serialize";
import { libraryStore } from "@/lib/store/library";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiAuth(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const body = await request.json().catch(() => null) as { pinned?: boolean } | null;
  const existing = await libraryStore.getBlock(id);
  if (!existing) notFound();
  const block = await libraryStore.setBlockPinned(id, body?.pinned !== false);
  const [nodes, topics, jobs] = await Promise.all([libraryStore.listNodes(), libraryStore.listTopics(), libraryStore.listJobs()]);
  return Response.json({ block: serializeBlockDetail(block, nodes, topics, jobs) });
}
