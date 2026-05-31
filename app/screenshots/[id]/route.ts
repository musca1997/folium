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

  try {
    const bytes = await readFile(join(process.cwd(), "data", "screenshots", `${id}.png`));
    return new Response(bytes, {
      headers: {
        "content-type": "image/png",
        "cache-control": "private, max-age=3600",
      },
    });
  } catch {
    notFound();
  }
}
