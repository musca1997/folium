import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";
import { assertSafePublicUrl } from "@/lib/security/urlSafety";

export type ScreenshotResult = {
  path: string | null;
  error: string | null;
};

export function screenshotPathForBlock(blockId: string): string {
  return `/screenshots/${blockId}`;
}

export async function captureScreenshot(url: string, blockId: string): Promise<ScreenshotResult> {
  const safeUrl = await assertSafePublicUrl(url);
  const publicPath = screenshotPathForBlock(blockId);
  const outputDir = join(process.cwd(), "data", "screenshots");
  const outputPath = join(outputDir, `${blockId}.webp`);
  const legacyOutputPath = join(outputDir, `${blockId}.png`);
  await mkdir(outputDir, { recursive: true });

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(safeUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(1200);
    const png = await page.screenshot({ type: "png", fullPage: false });
    await sharp(png).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 72 }).toFile(outputPath);
    await rm(legacyOutputPath, { force: true });
    return { path: publicPath, error: null };
  } catch (error) {
    return { path: null, error: error instanceof Error ? error.message : "Unknown screenshot error" };
  } finally {
    await browser?.close();
  }
}
