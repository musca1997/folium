import type { Block, WikiNode } from "@/lib/store/types";
import { BlockCard } from "./BlockCard";

export function BlockGrid({ blocks, nodes }: { blocks: Block[]; nodes: WikiNode[] }) {
  if (blocks.length === 0) {
    return (
      <div className="border border-line p-10 text-sm text-muted">
        <p className="text-ink">No blocks yet.</p>
        <p className="mt-2">Add a URL to start growing your library.</p>
      </div>
    );
  }

  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
      {blocks.map((block) => (
        <div key={block.id} className="mb-4 break-inside-avoid">
          <BlockCard block={block} nodes={nodes} />
        </div>
      ))}
    </div>
  );
}
