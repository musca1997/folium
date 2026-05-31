import { requireApiAuth } from "@/lib/apiAuth";
import { serializeBlock } from "@/lib/api/serialize";
import { libraryStore } from "@/lib/store/library";

export async function GET(request: Request) {
  const unauthorized = await requireApiAuth(request);
  if (unauthorized) return unauthorized;
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const [{ blocks, nodes }, allNodes, topics] = await Promise.all([libraryStore.search(query), libraryStore.listNodes(), libraryStore.listTopics()]);
  return Response.json({ query, blocks: blocks.map((block) => serializeBlock(block, allNodes, topics)), nodes });
}
