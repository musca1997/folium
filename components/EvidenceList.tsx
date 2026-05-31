import type { Block, Topic, WikiNode } from "@/lib/store/types";

export function EvidenceList({ block, nodes, topics }: { block: Block; nodes: WikiNode[]; topics: Topic[] }) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const entries = [
    ...block.topicLinks.map((link) => ({ title: topicById.get(link.topicId)?.name ?? "Topic", reason: link.reason, claims: link.claims ?? [], evidence: link.evidence ?? [] })),
    ...block.nodeLinks.map((link) => ({ title: nodeById.get(link.nodeId)?.name ?? "Node", reason: link.reason, claims: link.claims ?? [], evidence: link.evidence ?? [] })),
  ].filter((entry) => entry.reason || entry.claims.length || entry.evidence.length);

  if (!entries.length) return <p className="text-sm text-muted">No references stored for this block yet.</p>;

  return (
    <div className="max-h-[34rem] space-y-4 overflow-y-auto pr-2">
      {entries.map((entry, index) => (
        <div key={`${entry.title}-${index}`} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
          <p className="text-sm">{entry.title}</p>
          {entry.reason ? <p className="mt-1 text-xs leading-relaxed text-muted">{entry.reason}</p> : null}
          {entry.claims.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
              {entry.claims.map((claim) => <li key={claim}>{claim}</li>)}
            </ul>
          ) : null}
          {entry.evidence.slice(0, 2).map((item) => (
            <blockquote key={`${item.source}-${item.quote}`} className="mt-2 border-l border-line pl-3 text-xs italic text-muted">
              “{item.quote}” <span className="not-italic">({item.source})</span>
            </blockquote>
          ))}
        </div>
      ))}
    </div>
  );
}
