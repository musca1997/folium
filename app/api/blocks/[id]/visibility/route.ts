import { notFound } from "next/navigation";
import { requireApiAuth } from "@/lib/apiAuth";
import { serializeBlockDetail } from "@/lib/api/serialize";
import { libraryStore } from "@/lib/store/library";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiAuth(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const body = await request.json().catch(() => null) as { visibility?: string } | null;
  if (body?.visibility !== "public" && body?.visibility !== "private") return Response.json({ error: "invalid_visibility" }, { status: 400 });
  const existing = await libraryStore.getBlock(id);
  if (!existing) notFound();
  const block = await libraryStore.updateBlock(id, { visibility: body.visibility });
  const [nodes, topics, jobs] = await Promise.all([libraryStore.listNodes(), libraryStore.listTopics(), libraryStore.listJobs()]);
  return Response.json({ block: serializeBlockDetail(block, nodes, topics, jobs) });
}
