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

async function writeScreenshotBuffer(buffer: Buffer, blockId: string): Promise<ScreenshotResult> {
  const publicPath = screenshotPathForBlock(blockId);
  const outputDir = join(process.cwd(), "data", "screenshots");
  const outputPath = join(outputDir, `${blockId}.webp`);
  const legacyOutputPath = join(outputDir, `${blockId}.png`);
  await mkdir(outputDir, { recursive: true });
  try {
    await sharp(buffer).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 72 }).toFile(outputPath);
    await rm(legacyOutputPath, { force: true });
    return { path: publicPath, error: null };
  } catch (error) {
    return { path: null, error: error instanceof Error ? error.message : "Unknown screenshot error" };
  }
}

export async function saveScreenshotDataUrl(dataUrl: string, blockId: string): Promise<ScreenshotResult> {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return { path: null, error: "Unsupported screenshot data URL" };
  return writeScreenshotBuffer(Buffer.from(match[2], "base64"), blockId);
}

export async function captureScreenshot(url: string, blockId: string): Promise<ScreenshotResult> {
  const safeUrl = await assertSafePublicUrl(url);
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(safeUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(1200);
    const png = await page.screenshot({ type: "png", fullPage: false });
    return writeScreenshotBuffer(png, blockId);
  } catch (error) {
    return { path: null, error: error instanceof Error ? error.message : "Unknown screenshot error" };
  } finally {
    await browser?.close();
  }
}
