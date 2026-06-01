import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { coarseCategoryForTopic } from "@/lib/graph/categories";
import { isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";

export const revalidate = 2;

type BaseGraph = Awaited<ReturnType<typeof libraryStore.getGraphData>>;
type GraphNodeKind = "root" | "category" | "topic" | "wiki_node" | "block";
type PositionedNode = { id: string; label: string; kind: GraphNodeKind; href: string | null; x: number; y: number; r: number; type?: string; categoryId?: string; topicId?: string };
type VisualEdgeKind = "root_category" | "category_topic" | "topic_block" | "block_node";
type VisualEdge = { id: string; from: string; to: string; weight: number; kind: VisualEdgeKind };

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

function relaxCollisions(nodes: PositionedNode[], width: number, height: number): PositionedNode[] {
  const next = nodes.map((node) => ({ ...node }));
  const fixed = new Set(next.filter((node) => node.kind === "root" || node.kind === "category" || node.kind === "topic").map((node) => node.id));
  for (let pass = 0; pass < 70; pass += 1) {
    for (let i = 0; i < next.length; i += 1) {
      for (let j = i + 1; j < next.length; j += 1) {
        const a = next[i];
        const b = next[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const minDistance = a.r + b.r + (a.kind === "block" || b.kind === "block" ? 16 : 20);
        if (distance >= minDistance) continue;
        const overlap = (minDistance - distance) / 2;
        const ux = dx / distance;
        const uy = dy / distance;
        const aFixed = fixed.has(a.id);
        const bFixed = fixed.has(b.id);
        if (!aFixed) {
          a.x -= ux * (bFixed ? overlap * 1.8 : overlap);
          a.y -= uy * (bFixed ? overlap * 1.8 : overlap);
        }
        if (!bFixed) {
          b.x += ux * (aFixed ? overlap * 1.8 : overlap);
          b.y += uy * (aFixed ? overlap * 1.8 : overlap);
        }
      }
    }
  }
  for (const node of next) {
    node.x = clamp(node.x, 38, width - 180);
    node.y = clamp(node.y, 38, height - 38);
  }
  return next;
}

async function buildTopicGraph(publicOnly = false) {
  const graph: BaseGraph = publicOnly ? await libraryStore.getPublicGraphData() : await libraryStore.getGraphData();
  const width = 1500;
  const height = 960;
  const cx = width / 2;
  const cy = height / 2;
  const topics = graph.nodes.filter((node) => node.kind === "topic");
  const wikiNodes = graph.nodes.filter((node) => node.kind === "wiki_node");
  const blocks = graph.nodes.filter((node) => node.kind === "block");
  const positioned = new Map<string, PositionedNode>();
  const visualEdges: VisualEdge[] = [];

  const topicEdgesByBlock = new Map<string, BaseGraph["edges"]>();
  const blockEdgesByNode = new Map<string, BaseGraph["edges"]>();
  for (const edge of graph.edges) {
    if (edge.kind === "topic_block") topicEdgesByBlock.set(edge.to, [...(topicEdgesByBlock.get(edge.to) ?? []), edge]);
    if (edge.kind === "block_node") blockEdgesByNode.set(edge.to, [...(blockEdgesByNode.get(edge.to) ?? []), edge]);
  }

  const blocksByTopic = new Map<string, typeof blocks>();
  for (const edge of graph.edges) {
    if (edge.kind !== "topic_block") continue;
    const block = blocks.find((item) => item.id === edge.to);
    if (block) blocksByTopic.set(edge.from, [...(blocksByTopic.get(edge.from) ?? []), block]);
  }

  const categoryByTopicId = new Map<string, { id: string; name: string }>();
  const topicsByCategory = new Map<string, typeof topics>();
  for (const topic of topics) {
    const category = coarseCategoryForTopic(topic.label);
    const categoryInfo = { id: `category:${category.name}`, name: category.name };
    categoryByTopicId.set(topic.id, categoryInfo);
    topicsByCategory.set(categoryInfo.id, [...(topicsByCategory.get(categoryInfo.id) ?? []), topic]);
  }
  const categories = [...new Map([...categoryByTopicId.values()].map((category) => [category.id, category])).values()].sort((a, b) => a.name.localeCompare(b.name));

  positioned.set("root", { id: "root", label: "Folium", kind: "root", href: null, x: cx, y: cy, r: 30 });

  categories.forEach((category, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(categories.length, 1) - Math.PI / 2;
    const childTopics = topicsByCategory.get(category.id) ?? [];
    const relatedBlocks = childTopics.reduce((count, topic) => count + (blocksByTopic.get(topic.id)?.length ?? 0), 0);
    positioned.set(category.id, { id: category.id, label: category.name, kind: "category", href: `/search?q=${encodeURIComponent(category.name)}`, x: cx + Math.cos(angle) * 190, y: cy + Math.sin(angle) * 190, r: 22 + Math.min(relatedBlocks, 12) });
    visualEdges.push({ id: `root-${category.id}`, from: "root", to: category.id, weight: 1, kind: "root_category" });
  });

  for (const category of categories) {
    const categoryNode = positioned.get(category.id);
    const siblings = topicsByCategory.get(category.id) ?? [];
    if (!categoryNode) continue;
    siblings.forEach((topic, siblingIndex) => {
      const baseAngle = Math.atan2(categoryNode.y - cy, categoryNode.x - cx);
      const spread = Math.PI * 0.9;
      const offset = siblings.length === 1 ? 0 : -spread / 2 + (spread * siblingIndex) / (siblings.length - 1);
      const angle = baseAngle + offset;
      const topicBlockCount = blocksByTopic.get(topic.id)?.length ?? 0;
      positioned.set(topic.id, { ...topic, kind: "topic", categoryId: category.id, x: categoryNode.x + Math.cos(angle) * 170, y: categoryNode.y + Math.sin(angle) * 170, r: 12 + Math.min(topicBlockCount, 12) });
      visualEdges.push({ id: `${category.id}-${topic.id}`, from: category.id, to: topic.id, weight: 0.85, kind: "category_topic" });
    });
  }

  const blockIndexByTopic = new Map<string, number>();
  blocks.forEach((block, index) => {
    const topicEdge = (topicEdgesByBlock.get(block.id) ?? []).sort((a, b) => b.relevance - a.relevance)[0];
    const topic = topicEdge ? positioned.get(topicEdge.from) : null;
    const categoryId = topic?.categoryId;
    const topicBlockIndex = topic ? blockIndexByTopic.get(topic.id) ?? 0 : index;
    if (topic) blockIndexByTopic.set(topic.id, topicBlockIndex + 1);
    const siblingCount = topic ? Math.max(blocksByTopic.get(topic.id)?.length ?? 1, 1) : blocks.length;
    const ring = 108 + Math.floor(topicBlockIndex / 10) * 48;
    const angle = topic ? Math.atan2(topic.y - cy, topic.x - cx) - Math.PI / 2 + (Math.PI * 2 * (topicBlockIndex % 10)) / Math.min(siblingCount, 10) : (Math.PI * 2 * index) / Math.max(blocks.length, 1);
    positioned.set(block.id, { ...block, kind: "block", categoryId, topicId: topic?.id, x: (topic?.x ?? cx) + Math.cos(angle) * ring, y: (topic?.y ?? cy) + Math.sin(angle) * ring, r: 6.5 });
  });

  const nodeIndexByTopic = new Map<string, number>();
  wikiNodes.forEach((node, index) => {
    const bestBlockEdge = (blockEdgesByNode.get(node.id) ?? []).sort((a, b) => b.relevance - a.relevance)[0];
    const block = bestBlockEdge ? positioned.get(bestBlockEdge.from) : null;
    const topic = block?.topicId ? positioned.get(block.topicId) : null;
    const anchor = topic ?? block;
    const topicKey = topic?.id ?? block?.id ?? "loose";
    const localIndex = nodeIndexByTopic.get(topicKey) ?? 0;
    nodeIndexByTopic.set(topicKey, localIndex + 1);
    const degree = graph.edges.filter((edge) => edge.to === node.id || edge.from === node.id).length;
    const ring = node.type === "Source" ? 260 + (localIndex % 4) * 18 : 180 + Math.floor(localIndex / 12) * 44;
    const angle = anchor ? Math.atan2((anchor.y ?? cy) - cy, (anchor.x ?? cx) - cx) + Math.PI / 2 + (Math.PI * 2 * (localIndex % 12)) / 12 : (Math.PI * 2 * index) / Math.max(wikiNodes.length, 1);
    positioned.set(node.id, { ...node, kind: "wiki_node", categoryId: block?.categoryId, topicId: block?.topicId, x: (anchor?.x ?? cx) + Math.cos(angle) * ring, y: (anchor?.y ?? cy) + Math.sin(angle) * ring, r: node.type === "Source" ? 4.5 : 7 + Math.min(degree, 8) });
  });

  for (const edge of graph.edges) {
    if (!positioned.has(edge.from) || !positioned.has(edge.to)) continue;
    visualEdges.push({ id: edge.id, from: edge.from, to: edge.to, weight: edge.relevance, kind: edge.kind });
  }

  const relaxed = relaxCollisions([...positioned.values()], width, height);
  return { width, height, positioned: relaxed, edges: visualEdges, categoryCount: categories.length, fineTopicCount: topics.length };
}

export default async function GraphPage() {
  const authed = await isAuthenticated();
  const graph = await buildTopicGraph(!authed);
  const blockCount = graph.positioned.filter((node) => node.kind === "block").length;
  const wikiCount = graph.positioned.filter((node) => node.kind === "wiki_node").length;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-6">
        <PageIntro eyebrow="Knowledge map" title="Graph" description="A clustered map of the library: LCC topics act as knowledge islands, with links and reusable nodes arranged around them." />
        <div className="mb-6 flex gap-2 text-xs uppercase tracking-wide text-muted">
          <span className="border border-line px-2 py-1">{graph.categoryCount} broad categories</span>
          <span className="border border-line px-2 py-1">{graph.fineTopicCount} topics</span>
          <span className="border border-line px-2 py-1">{wikiCount} nodes</span>
          <span className="border border-line px-2 py-1">{blockCount} links</span>
        </div>
        <GraphCanvas width={graph.width} height={graph.height} nodes={graph.positioned} edges={graph.edges} />
      </main>
    </>
  );
}
