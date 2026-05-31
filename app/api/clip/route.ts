import { requireApiAuth } from "@/lib/apiAuth";
import { serializeBlock } from "@/lib/api/serialize";
import { assertSafePublicUrl } from "@/lib/security/urlSafety";
import { libraryStore } from "@/lib/store/library";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const inputUrl = asString(body?.url).trim();
  if (!inputUrl) return Response.json({ error: "missing_url" }, { status: 400 });

  let url: string;
  try { url = await assertSafePublicUrl(inputUrl); } catch (error) {
    return Response.json({ error: "unsafe_url", message: error instanceof Error ? error.message : "URL rejected" }, { status: 400 });
  }

  const contentText = asString(body?.contentText).trim();
  if (contentText.length < 20) return Response.json({ error: "content_too_short" }, { status: 400 });

  const visibility = body?.visibility === "public" ? "public" : "private";
  const result = await libraryStore.addUrlBlock(url, visibility);
  const block = await libraryStore.setProvidedContent(result.block.id, {
    title: asString(body?.title),
    description: asString(body?.description),
    contentText,
    contentHtml: asString(body?.htmlContent),
    canonicalUrl: asString(body?.canonicalUrl) || url,
    previewImage: asNullableString(body?.previewImage),
    favicon: asNullableString(body?.favicon),
    extractionMethod: "browser_extension",
  });
  const [nodes, topics] = await Promise.all([libraryStore.listNodes(), libraryStore.listTopics()]);
  return Response.json({ block: serializeBlock(block, nodes, topics), created: result.created, duplicate: result.duplicate, queued: true }, { status: result.created ? 201 : 200 });
}
