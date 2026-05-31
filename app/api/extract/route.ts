import { requireApiAuth } from "@/lib/apiAuth";
import { browserExtractPage } from "@/lib/ingest/browserExtract";
import { fetchAndExtractPage } from "@/lib/ingest/extract";
import { assertSafePublicUrl } from "@/lib/security/urlSafety";

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth(request);
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null) as { url?: string; browser?: boolean } | null;
  const inputUrl = body?.url?.trim();
  if (!inputUrl) return Response.json({ error: "missing_url" }, { status: 400 });
  let url: string;
  try { url = await assertSafePublicUrl(inputUrl); } catch (error) {
    return Response.json({ error: "unsafe_url", message: error instanceof Error ? error.message : "URL rejected" }, { status: 400 });
  }

  const fetchResult = body?.browser ? null : await fetchAndExtractPage(url).then((data) => ({ data, error: null as string | null })).catch((error) => ({ data: null, error: error instanceof Error ? error.message : "Fetch extraction failed" }));
  if (fetchResult?.data && fetchResult.data.textContent.length >= 300) return Response.json({ method: "fetch", extraction: fetchResult.data });

  const browserResult = await browserExtractPage(url).then((data) => ({ data, error: null as string | null })).catch((error) => ({ data: null, error: error instanceof Error ? error.message : "Browser extraction failed" }));
  if (browserResult.data) return Response.json({ method: "browser", extraction: browserResult.data, fetchError: fetchResult?.error ?? null });

  return Response.json({ error: "extract_failed", fetchError: fetchResult?.error ?? null, browserError: browserResult.error }, { status: 502 });
}
