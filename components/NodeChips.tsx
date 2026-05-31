import Link from "next/link";
import type { Block, WikiNode } from "@/lib/store/types";

export function NodeChips({ block, nodes }: { block: Block; nodes: WikiNode[] }) {
  const linked = block.nodeLinks
    .map((link) => nodes.find((node) => node.id === link.nodeId))
    .filter((node): node is WikiNode => Boolean(node));

  if (linked.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {linked.slice(0, 4).map((node) => (
        <Link key={node.id} href={`/nodes/${node.slug}`} className="border border-line px-2 py-0.5 text-xs text-muted hover:border-ink hover:text-ink">
          {node.name}
        </Link>
      ))}
    </div>
  );
}
