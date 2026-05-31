import { chromium } from "playwright";
import { extractPageDataFromHtml, type ExtractedPageData } from "@/lib/ingest/extract";

export async function browserExtractPage(url: string): Promise<ExtractedPageData> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(1500);
    const finalUrl = page.url() || url;
    const html = await page.content();
    return extractPageDataFromHtml(html, finalUrl);
  } finally {
    await browser?.close();
  }
}
