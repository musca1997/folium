import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

export type ScreenshotResult = {
  path: string | null;
  error: string | null;
};

export function screenshotPathForBlock(blockId: string): string {
  return `/screenshots/${blockId}`;
}

export async function captureScreenshot(url: string, blockId: string): Promise<ScreenshotResult> {
  const publicPath = screenshotPathForBlock(blockId);
  const outputDir = join(process.cwd(), "data", "screenshots");
  const outputPath = join(outputDir, `${blockId}.png`);
  await mkdir(outputDir, { recursive: true });

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: outputPath, fullPage: false });
    return { path: publicPath, error: null };
  } catch (error) {
    return { path: null, error: error instanceof Error ? error.message : "Unknown screenshot error" };
  } finally {
    await browser?.close();
  }
}
