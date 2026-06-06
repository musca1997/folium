import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const block = await libraryStore.getBlock(id);
  if (!block) notFound();
  if (block.visibility !== "public" && !(await isAuthenticated())) notFound();

  const cacheControl = block.visibility === "public" ? "public, max-age=31536000, immutable" : "private, max-age=86400";

  try {
    const bytes = await readFile(join(process.cwd(), "data", "screenshots", `${id}.webp`));
    return new Response(bytes, { headers: { "content-type": "image/webp", "cache-control": cacheControl } });
  } catch {
    // Try the legacy PNG screenshot below.
  }

  try {
    const bytes = await readFile(join(process.cwd(), "data", "screenshots", `${id}.png`));
    return new Response(bytes, { headers: { "content-type": "image/png", "cache-control": cacheControl } });
  } catch {
    // Fall through to 404.
  }

  notFound();
}
