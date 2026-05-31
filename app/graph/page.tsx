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

async function buildTopicGraph(publicOnly = false) {
  const graph: BaseGraph = publicOnly ? await libraryStore.getPublicGraphData() : await libraryStore.getGraphData();
  const width = 1300;
  const height = 820;
  const cx = width / 2;
  const cy = height / 2;
  const topics = graph.nodes.filter((node) => node.kind === "topic");
  const wikiNodes = graph.nodes.filter((node) => node.kind === "wiki_node");
  const blocks = graph.nodes.filter((node) => node.kind === "block");
  const positioned = new Map<string, PositionedNode>();
  const visualEdges: VisualEdge[] = [];

  const blocksByTopic = new Map<string, typeof blocks>();
  const nodesByBlock = new Map<string, typeof wikiNodes>();
  for (const edge of graph.edges) {
    if (edge.kind === "topic_block") blocksByTopic.set(edge.from, [...(blocksByTopic.get(edge.from) ?? []), blocks.find((block) => block.id === edge.to)!].filter(Boolean));
    if (edge.kind === "block_node") nodesByBlock.set(edge.from, [...(nodesByBlock.get(edge.from) ?? []), wikiNodes.find((node) => node.id === edge.to)!].filter(Boolean));
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
    positioned.set(category.id, { id: category.id, label: category.name, kind: "category", href: `/search?q=${encodeURIComponent(category.name)}`, x: cx + Math.cos(angle) * 155, y: cy + Math.sin(angle) * 155, r: 20 + Math.min(relatedBlocks, 12) });
    visualEdges.push({ id: `root-${category.id}`, from: "root", to: category.id, weight: 1, kind: "root_category" });
  });

  for (const category of categories) {
    const categoryNode = positioned.get(category.id);
    const siblings = topicsByCategory.get(category.id) ?? [];
    if (!categoryNode) continue;
    siblings.forEach((topic, siblingIndex) => {
      const baseAngle = Math.atan2(categoryNode.y - cy, categoryNode.x - cx);
      const spread = Math.PI * 0.8;
      const offset = siblings.length === 1 ? 0 : -spread / 2 + (spread * siblingIndex) / (siblings.length - 1);
      const angle = baseAngle + offset;
      const topicBlockCount = blocksByTopic.get(topic.id)?.length ?? 0;
      positioned.set(topic.id, { ...topic, kind: "topic", categoryId: category.id, x: categoryNode.x + Math.cos(angle) * 140, y: categoryNode.y + Math.sin(angle) * 140, r: 9 + Math.min(topicBlockCount, 8) });
      visualEdges.push({ id: `${category.id}-${topic.id}`, from: category.id, to: topic.id, weight: 0.8, kind: "category_topic" });
    });
  }

  blocks.forEach((block, index) => {
    const topicEdge = graph.edges.find((edge) => edge.kind === "topic_block" && edge.to === block.id);
    const topic = topicEdge ? positioned.get(topicEdge.from) : null;
    const categoryId = topic?.categoryId;
    const angle = topic ? Math.atan2(topic.y - cy, topic.x - cx) + ((index % 5) - 2) * 0.12 : (Math.PI * 2 * index) / Math.max(blocks.length, 1);
    const radius = 420 + (index % 4) * 34;
    positioned.set(block.id, { ...block, kind: "block", categoryId, topicId: topic?.id, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, r: 5.5 });
  });

  wikiNodes.forEach((node, index) => {
    const connectedBlockEdge = graph.edges.find((edge) => edge.kind === "block_node" && edge.to === node.id);
    const block = connectedBlockEdge ? positioned.get(connectedBlockEdge.from) : null;
    const angle = block ? Math.atan2(block.y - cy, block.x - cx) + ((index % 3) - 1) * 0.08 : (Math.PI * 2 * index) / Math.max(wikiNodes.length, 1);
    const degree = graph.edges.filter((edge) => edge.to === node.id || edge.from === node.id).length;
    positioned.set(node.id, { ...node, kind: "wiki_node", categoryId: block?.categoryId, topicId: block?.topicId, x: cx + Math.cos(angle) * 500, y: cy + Math.sin(angle) * 500, r: 7 + Math.min(degree, 8) * 1.2 });
  });

  for (const edge of graph.edges) {
    if (!positioned.has(edge.from) || !positioned.has(edge.to)) continue;
    visualEdges.push({ id: edge.id, from: edge.from, to: edge.to, weight: edge.relevance, kind: edge.kind });
  }

  return { width, height, positioned: [...positioned.values()], edges: visualEdges, categoryCount: categories.length, fineTopicCount: topics.length };
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
        <PageIntro eyebrow="Knowledge map" title="Graph" description="A zoomable map of the living wiki: broad categories first, finer topics second, then links and generated nodes." />
        <div className="mb-6 flex gap-2 text-xs uppercase tracking-wide text-muted">
          <span className="border border-line px-2 py-1">{graph.categoryCount} broad categories</span>
          <span className="border border-line px-2 py-1">{graph.fineTopicCount} fine topics</span>
          <span className="border border-line px-2 py-1">{wikiCount} nodes</span>
          <span className="border border-line px-2 py-1">{blockCount} links</span>
        </div>
        <GraphCanvas width={graph.width} height={graph.height} nodes={graph.positioned} edges={graph.edges} />
      </main>
    </>
  );
}
