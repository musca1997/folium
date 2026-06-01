import { z } from "zod";

const EvidenceSnippetSchema = z.object({
  quote: z.string().min(1),
  source: z.enum(["title", "description", "text"]).default("text"),
});

const RawNodeSchema = z.object({
  type: z.string().default("Concept"),
  name: z.string().min(1),
  description: z.string().optional().default(""),
  relevance: z.number(),
  claims: z.array(z.string()).default([]),
  evidence: z.array(EvidenceSnippetSchema).default([]),
});

const RawTopicSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  confidence: z.number(),
  claims: z.array(z.string()).default([]),
  evidence: z.array(EvidenceSnippetSchema).default([]),
});

const RawAnalysisSchema = z.object({
  summary: z.string().default(""),
  summaryZh: z.string().optional().default(""),
  topics: z.array(RawTopicSchema).default([]),
  nodes: z.array(RawNodeSchema).default([]),
});

export type LlmNodeAnalysis = z.infer<typeof RawNodeSchema>;
export type LlmTopicAnalysis = z.infer<typeof RawTopicSchema>;

export type LlmAnalysis = {
  summary: string;
  summaryTranslations?: {
    zh?: string;
  };
  topics: LlmTopicAnalysis[];
  nodes: LlmNodeAnalysis[];
};

function cleanClaims(claims: string[]): string[] {
  return claims.map((claim) => claim.trim()).filter(Boolean).slice(0, 3);
}

function cleanEvidence(evidence: z.infer<typeof EvidenceSnippetSchema>[]): z.infer<typeof EvidenceSnippetSchema>[] {
  return evidence
    .map((item) => ({ ...item, quote: item.quote.trim().slice(0, 280) }))
    .filter((item) => item.quote.length > 0)
    .slice(0, 3);
}

const platformFeatureNodeNames = new Set([
  "github issues",
  "github actions",
  "pull requests",
  "github pull requests",
  "github stars",
  "github forks",
  "npm downloads",
  "discord channels",
  "youtube comments",
  "reddit threads",
  "web reference",
]);

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isGenericPlatformFeatureNode(node: z.infer<typeof RawNodeSchema>): boolean {
  return platformFeatureNodeNames.has(normalizeName(node.name));
}

function preferCoarseNodes(nodes: z.infer<typeof RawNodeSchema>[]): z.infer<typeof RawNodeSchema>[] {
  const mainSources = nodes.filter((node) => ["Source", "Project", "Person", "Work"].includes(node.type) && node.relevance >= 0.75);
  const concepts = nodes.filter((node) => !mainSources.includes(node)).sort((a, b) => b.relevance - a.relevance);
  const selected = [...mainSources.slice(0, 2), ...concepts].slice(0, 5);
  return selected.length >= 3 ? selected : [...nodes].sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

export function parseLlmAnalysis(raw: string): LlmAnalysis {
  const parsed = RawAnalysisSchema.parse(JSON.parse(raw));
  return {
    summary: parsed.summary,
    summaryTranslations: parsed.summaryZh.trim() ? { zh: parsed.summaryZh.trim() } : undefined,
    topics: parsed.topics
      .filter((topic) => topic.confidence >= 0.35 && topic.confidence <= 1)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 2)
      .map((topic) => ({ ...topic, claims: cleanClaims(topic.claims), evidence: cleanEvidence(topic.evidence) })),
    nodes: preferCoarseNodes(parsed.nodes
      .filter((node) => node.relevance >= 0 && node.relevance <= 1)
      .filter((node) => !isGenericPlatformFeatureNode(node)))
      .map((node) => ({ ...node, claims: cleanClaims(node.claims), evidence: cleanEvidence(node.evidence) })),
  };
}
