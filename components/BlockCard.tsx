import Link from "next/link";
import { toggleBlockPinAction } from "@/app/actions";
import type { Block, WikiNode } from "@/lib/store/types";
import { NodeChips } from "./NodeChips";

const statusCopy: Record<Block["status"], string> = {
  pending: "Queued",
  fetching: "Fetching metadata",
  screenshotting: "Capturing preview",
  thinking: "Thinking",
  indexed: "Indexed",
  failed: "Failed",
};

function previewRatio(block: Block): string {
  const seed = block.id.charCodeAt(block.id.length - 1) % 4;
  return ["aspect-[4/3]", "aspect-square", "aspect-[3/4]", "aspect-[5/4]"][seed] ?? "aspect-[4/3]";
}

function initials(domain: string): string {
  return domain.replace(/^www\./, "").split(".")[0]?.slice(0, 2) || "f";
}

export function BlockCard({ block, nodes, authed = false, csrf = "" }: { block: Block; nodes: WikiNode[]; authed?: boolean; csrf?: string }) {
  const isProcessing = block.status !== "indexed" && block.status !== "failed";
  const image = block.screenshotPath ?? block.previewImage;

  return (
    <article className="group border border-line bg-white transition-colors hover:bg-[#fbfbfb]">
      <Link href={`/blocks/${block.id}`} className="block">
        <div className={`relative flex ${previewRatio(block)} items-center justify-center overflow-hidden border-b border-line bg-soft text-center text-xs text-muted`}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover grayscale transition duration-300 group-hover:grayscale-0" />
          ) : block.favicon ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.favicon} alt="" loading="lazy" decoding="async" className="h-10 w-10 object-contain grayscale" />
              <p className="max-w-[70%] break-words text-xs text-muted">{block.domain}</p>
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-[#f3f3f3] px-4">
              <div className="flex h-16 w-16 items-center justify-center border border-line bg-white text-xl text-ink">{initials(block.domain)}</div>
              <p className="mt-4 max-w-[70%] break-words text-xs text-muted">{isProcessing ? statusCopy[block.status] : block.domain}</p>
            </div>
          )}
          {isProcessing ? <div className="absolute left-2 top-2 border border-line bg-white px-2 py-1 text-[10px] uppercase tracking-wide text-muted">{statusCopy[block.status]}</div> : null}
          {block.curation?.favorite ? <div className="absolute right-2 top-2 border border-line bg-white px-2 py-1 text-[10px] uppercase tracking-wide text-ink">Pinned</div> : null}
        </div>
        <div className="space-y-3 p-3">
          <div>
            <h2 className="text-sm leading-snug group-hover:underline">{block.title || block.url}</h2>
            <p className="mt-1 text-xs text-muted">{block.domain}</p>
          </div>
          {block.summary || block.description ? (
            <p className="text-xs leading-relaxed text-muted">{block.summary || block.description}</p>
          ) : isProcessing ? (
            <p className="text-xs leading-relaxed text-muted">This block has been saved and is waiting for the worker.</p>
          ) : null}
        </div>
      </Link>
      <div className="space-y-3 px-3 pb-3">
        <NodeChips block={block} nodes={nodes} />
        {authed ? (
          <form action={toggleBlockPinAction}>
            <input type="hidden" name="csrf" value={csrf} />
            <input type="hidden" name="id" value={block.id} />
            <input type="hidden" name="pinned" value={block.curation?.favorite ? "false" : "true"} />
            <input type="hidden" name="next" value="/" />
            <button type="submit" className="text-xs text-muted underline hover:text-ink">
              {block.curation?.favorite ? "Unpin" : "Pin"}
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}
