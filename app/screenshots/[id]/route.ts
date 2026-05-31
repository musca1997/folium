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

  const candidates = [
    { path: join(process.cwd(), "data", "screenshots", `${id}.webp`), contentType: "image/webp" },
    { path: join(process.cwd(), "data", "screenshots", `${id}.png`), contentType: "image/png" },
  ];

  for (const candidate of candidates) {
    try {
      const bytes = await readFile(candidate.path);
      return new Response(bytes, {
        headers: {
          "content-type": candidate.contentType,
          "cache-control": block.visibility === "public" ? "public, max-age=31536000, immutable" : "private, max-age=86400",
        },
      });
    } catch {
      // Try the next format for legacy screenshots.
    }
  }

  notFound();
}
