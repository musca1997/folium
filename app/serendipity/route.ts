import { isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";
import type { Block } from "@/lib/store/types";

export const revalidate = 0;

export function randomBlockPath(blocks: Block[], random: () => number = Math.random): string {
  if (blocks.length === 0) return "/";
  const index = Math.min(Math.floor(random() * blocks.length), blocks.length - 1);
  return `/blocks/${blocks[index].id}`;
}

export function serendipityRedirect(path: string): Response {
  return new Response(null, { status: 307, headers: { Location: path } });
}

export async function GET() {
  const authed = await isAuthenticated();
  const blocks = authed ? await libraryStore.listBlocks() : await libraryStore.listPublicBlocks();
  return serendipityRedirect(randomBlockPath(blocks));
}
