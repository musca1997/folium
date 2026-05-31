import Link from "next/link";
import type { Block, Topic, WikiNode } from "@/lib/store/types";

export function NodeChips({ block, nodes, topics = [] }: { block: Block; nodes: WikiNode[]; topics?: Topic[] }) {
  const linkedTopics = block.topicLinks
    .map((link) => topics.find((topic) => topic.id === link.topicId))
    .filter((topic): topic is Topic => Boolean(topic));
  const linkedNodes = block.nodeLinks
    .map((link) => nodes.find((node) => node.id === link.nodeId))
    .filter((node): node is WikiNode => Boolean(node));

  if (linkedTopics.length === 0 && linkedNodes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {linkedTopics.slice(0, 3).map((topic) => (
        <Link key={topic.id} href={`/topics/${topic.slug}`} className="border border-line px-2 py-0.5 text-xs font-semibold text-muted hover:border-ink hover:text-ink">
          {topic.name}
        </Link>
      ))}
      {linkedNodes.slice(0, 4).map((node) => (
        <Link key={node.id} href={`/nodes/${node.slug}`} className="border border-line px-2 py-0.5 text-xs text-muted hover:border-ink hover:text-ink">
          {node.name}
        </Link>
      ))}
    </div>
  );
}
