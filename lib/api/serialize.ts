import type { Block, Job, Topic, WikiNode } from "@/lib/store/types";

export function serializeBlock(block: Block, nodes: WikiNode[] = [], topics: Topic[] = []) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  return {
    id: block.id,
    url: block.url,
    domain: block.domain,
    title: block.title,
    summary: block.summary,
    description: block.description,
    status: block.status,
    visibility: block.visibility,
    pinned: Boolean(block.curation?.favorite),
    screenshotPath: block.screenshotPath,
    previewImage: block.previewImage,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
    topics: block.topicLinks.map((link) => ({ ...link, topic: topicById.get(link.topicId) ?? null })),
    nodes: block.nodeLinks.map((link) => ({ ...link, node: nodeById.get(link.nodeId) ?? null })),
  };
}

export function serializeBlockDetail(block: Block, nodes: WikiNode[] = [], topics: Topic[] = [], jobs: Job[] = []) {
  return {
    ...serializeBlock(block, nodes, topics),
    contentText: block.contentText,
    contentHtml: block.contentHtml,
    metadata: block.metadata,
    jobs: jobs.filter((job) => job.blockId === block.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
}
