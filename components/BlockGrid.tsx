import type { Block, Topic, WikiNode } from "@/lib/store/types";
import { BlockCard } from "./BlockCard";

export function BlockGrid({ blocks, nodes, topics = [], authed = false, csrf = "" }: { blocks: Block[]; nodes: WikiNode[]; topics?: Topic[]; authed?: boolean; csrf?: string }) {
  if (blocks.length === 0) {
    return (
      <div className="border border-line p-10 text-sm text-muted">
        <p className="text-ink">No blocks yet.</p>
        <p className="mt-2">Add a URL to start growing your library.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {blocks.map((block) => (
        <div key={block.id}>
          <BlockCard block={block} nodes={nodes} topics={topics} authed={authed} csrf={csrf} />
        </div>
      ))}
    </div>
  );
}
