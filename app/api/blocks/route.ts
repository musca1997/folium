import { requireApiAuth } from "@/lib/apiAuth";
import { assertSafePublicUrl } from "@/lib/security/urlSafety";
import { serializeBlock } from "@/lib/api/serialize";
import { libraryStore } from "@/lib/store/library";

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth(request);
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null) as { url?: string; visibility?: string } | null;
  const inputUrl = body?.url?.trim();
  if (!inputUrl) return Response.json({ error: "missing_url" }, { status: 400 });
  let url: string;
  try { url = await assertSafePublicUrl(inputUrl); } catch (error) {
    return Response.json({ error: "unsafe_url", message: error instanceof Error ? error.message : "URL rejected" }, { status: 400 });
  }
  const visibility = body?.visibility === "public" ? "public" : "private";
  const result = await libraryStore.addUrlBlock(url, visibility);
  if (result.created) await libraryStore.enqueueProcessBlock(result.block.id);
  const [nodes, topics] = await Promise.all([libraryStore.listNodes(), libraryStore.listTopics()]);
  return Response.json({ block: serializeBlock(result.block, nodes, topics), created: result.created, duplicate: result.duplicate }, { status: result.created ? 201 : 200 });
}
