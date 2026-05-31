import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { assertSafePublicUrl } from "@/lib/security/urlSafety";

export type ExtractedPageData = {
  title: string;
  description: string;
  previewImage: string | null;
  favicon: string | null;
  canonicalUrl: string;
  textContent: string;
  htmlContent: string;
};

function absoluteUrl(value: string | null | undefined, baseUrl: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function meta(document: Document, selector: string): string {
  return document.querySelector(selector)?.getAttribute("content")?.trim() ?? "";
}

export type VerificationBlockReason = "cloudflare_verification" | "human_verification" | "login_required";

export function detectVerificationBlock(input: { title?: string; textContent?: string }): VerificationBlockReason | null {
  const title = (input.title ?? "").toLowerCase();
  const text = (input.textContent ?? "").replace(/\s+/g, " ").toLowerCase();
  const combined = `${title} ${text}`;
  if (combined.includes("cloudflare") && (combined.includes("checking your browser") || combined.includes("just a moment") || combined.includes("ray id"))) return "cloudflare_verification";
  if (combined.includes("verify you are human") || combined.includes("checking if the site connection is secure") || combined.includes("captcha")) return "human_verification";
  if ((combined.includes("sign in") || combined.includes("log in") || combined.includes("login required")) && combined.length < 5000) return "login_required";
  return null;
}

export function extractPageDataFromHtml(html: string, sourceUrl: string): ExtractedPageData {
  const dom = new JSDOM(html, { url: sourceUrl });
  const { document } = dom.window;
  const readable = new Readability(document.cloneNode(true) as Document).parse();

  const title = meta(document, 'meta[property="og:title"]') || meta(document, 'meta[name="twitter:title"]') || document.title.trim();
  const description =
    meta(document, 'meta[property="og:description"]') || meta(document, 'meta[name="description"]') || meta(document, 'meta[name="twitter:description"]');
  const previewImage = absoluteUrl(
    meta(document, 'meta[property="og:image"]') || meta(document, 'meta[name="twitter:image"]'),
    sourceUrl,
  );
  const favicon = absoluteUrl(
    document.querySelector('link[rel="icon"]')?.getAttribute("href") ??
      document.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") ??
      "/favicon.ico",
    sourceUrl,
  );
  const canonicalUrl =
    absoluteUrl(document.querySelector('link[rel="canonical"]')?.getAttribute("href"), sourceUrl) ?? sourceUrl;

  return {
    title,
    description,
    previewImage,
    favicon,
    canonicalUrl,
    textContent: readable?.textContent?.trim() || document.body?.textContent?.replace(/\s+/g, " ").trim() || "",
    htmlContent: readable?.content ?? "",
  };
}

export async function fetchAndExtractPage(url: string): Promise<ExtractedPageData> {
  const safeUrl = await assertSafePublicUrl(url);
  const response = await fetch(safeUrl, {
    signal: AbortSignal.timeout(20_000),
    headers: {
      "user-agent": "Folium/0.1 (+self-hosted visual library)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${safeUrl}: ${response.status}`);
  const html = await response.text();
  return extractPageDataFromHtml(html, response.url || safeUrl);
}
