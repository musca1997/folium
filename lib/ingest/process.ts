import { getAiSettings } from "@/lib/settings";
import { parseLlmAnalysis, type LlmAnalysis } from "./llm";
import { getDomain, slugifyNodeName } from "./url";
import { classifyTextToLccTopic, lccCanonicalTopics, lccTopicCatalogForPrompt, toLccTopicAnalysis } from "@/lib/taxonomy/lcc";

type AnalyzeContext = {
  title?: string;
  description?: string;
  textContent?: string;
  existingTopics?: Array<{ name: string; description?: string }>;
  existingNodes?: Array<{ name: string; type?: string; description?: string }>;
};

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export function buildAnalysisPrompt(url: string, context: AnalyzeContext = {}): string {
  const text = (context.textContent ?? "").replace(/\s+/g, " ").slice(0, 12_000);
  const topicCatalog = lccTopicCatalogForPrompt();
  const nodeCatalog = (context.existingNodes ?? []).slice(0, 180).map((node) => `- ${node.name}${node.type ? ` (${node.type})` : ""}${node.description ? `: ${node.description}` : ""}`).join("\n");
  return `You are the AI librarian for Folium, a self-hosted visual knowledge library.
Analyze this saved web reference and classify it into Library of Congress Classification topics plus free graph wiki nodes.

Return only JSON. Do not wrap it in markdown. Do not add commentary.
The JSON shape must be:
{
  "summary": "one or two concise sentences",
  "topics": [
    {
      "name": "one exact canonical Library of Congress class name from the allowed list below, e.g. Science, Technology, Music, Fine Arts",
      "description": "what this topic means in this personal library",
      "confidence": 0.0,
      "claims": ["short claim explaining the page-topic relationship"],
      "evidence": [{ "quote": "short exact quote from title, description, or extracted text", "source": "text" }]
    }
  ],
  "nodes": [
    {
      "type": "Concept | Project | Source | Technology | Person | Work | Question | Aesthetic",
      "name": "short canonical node name",
      "description": "why this node matters here",
      "relevance": 0.0,
      "claims": ["short claim explaining the page-node relationship"],
      "evidence": [{ "quote": "short exact quote from title, description, or extracted text", "source": "text" }]
    }
  ]
}

Allowed canonical topics. Topics must use one of these exact Library of Congress Classification class names. Do not invent new topic names.

Canonical topics:
${topicCatalog}

Existing nodes:
${nodeCatalog || "- None yet"}

Rules:
- Topics must be selected from the canonical topic list above using exact names.
- Do not create new topic names. If none fits exactly, choose the nearest broader LCC class.
- Put modern or specific labels such as AI, Machine Learning, Cybersecurity, Self-hosting, LoRa, Meshtastic, Software Development, Design, Musicology, and Archives into nodes, not topic names.
- Before creating a new node, check the existing nodes above.
- Prefer reusing an existing node exact name if it is semantically close, even if the wording is not perfect.
- Do not create near-duplicates, plural variants, casing variants, or narrower synonyms of existing node names.
- Prefer 1 to 2 broad canonical topic classes.
- Prefer 3 to 5 high-signal nodes.
- Use coarse taxonomy mode: fewer, broader, more reusable topics and nodes are better than many precise ones.
- Only keep a node if it could plausibly connect at least 3 future saved links in this library, or if it is the main saved source/project/person/work.
- Omit one-off page details, section headings, table columns, UI labels, buttons, metrics, file names, route names, and incidental mentions.
- If a candidate node is just a narrower detail of a broader useful node, use the broader useful node instead.
- Do not create nodes for generic platform sub-features, UI areas, workflow surfaces, or generic container labels such as GitHub Issues, GitHub Actions, pull requests, stars, forks, npm downloads, Discord channels, YouTube comments, Reddit threads, browser tabs, Web Reference, webpage, website, article, or resource unless the saved page is specifically about that thing itself.
- For GitHub repository pages, prefer one node for the repository/project, one reusable node for GitHub when the platform matters, and semantic nodes for the actual subject matter. Do not use GitHub Issues as a node just because issue triage is mentioned.
- Topics should be semantic interests, not schema labels like Concept, Project, or Source.
- Claims are concise natural-language statements that explain why the link belongs to the node/topic.
- Evidence must be copied exactly from the supplied title, description, or extracted text; do not invent quotes.
- Prefer 1 to 3 evidence snippets per node/topic; use an empty evidence array if no direct quote exists.
- Keep node names reusable across future saves.
- For a repository, database, archive, or tool page, include the main source/project itself plus only the broad subject concepts that explain why it matters.
- Topic confidence and node relevance must be between 0 and 1.

URL: ${url}
Title: ${context.title ?? ""}
Description: ${context.description ?? ""}
Extracted text: ${text}`;
}

export function fallbackAnalysisForUrl(url: string, context: AnalyzeContext = {}): LlmAnalysis {
  const domain = getDomain(url);
  const name = domain.replace(/^www\./, "");

  return {
    summary:
      context.description ||
      context.textContent?.slice(0, 220) ||
      `Saved reference from ${domain}. Add an API key later to replace this with an LLM-written summary.`,
    topics: [
      {
        name: "Web Curation",
        description: "Saved web references and link organization.",
        confidence: 0.7,
        claims: [`${domain} was saved as a web reference.`],
        evidence: context.description ? [{ quote: context.description.slice(0, 280), source: "description" }] : [],
      },
    ],
    nodes: [
      {
        type: "Source",
        name,
        description: `Items collected from ${domain}.`,
        relevance: 0.9,
        claims: [`This page comes from ${domain}.`],
        evidence: context.description ? [{ quote: context.description.slice(0, 280), source: "description" }] : [],
      },
      {
        type: "Concept",
        name: "Web Reference",
        description: "A saved URL in the visual library.",
        relevance: 0.65,
        claims: ["This item is a saved URL in Folium."],
        evidence: context.description ? [{ quote: context.description.slice(0, 280), source: "description" }] : [],
      },
    ],
  };
}

async function analyzeWithOpenAI(url: string, context: AnalyzeContext): Promise<LlmAnalysis> {
  const settings = await getAiSettings();
  const apiKey = settings.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const endpoint = settings.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions";
  const model = settings.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetch(endpoint, {
    signal: AbortSignal.timeout(45_000),
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a precise librarian. You only return valid JSON matching the requested schema.",
        },
        {
          role: "user",
          content: buildAnalysisPrompt(url, context),
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`OpenAI-compatible analysis failed: ${response.status}`);
  const payload = (await response.json()) as OpenAIChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI-compatible analysis returned no content");
  return parseLlmAnalysis(content);
}

const containerTopics = new Set([
  "web curation",
  "personal blogs and web publishing",
  "visual research",
  "creative coding",
  "software development workflows",
  "online communities",
]);

function isLccTopic(name: string): boolean {
  return lccCanonicalTopics.some((topic) => topic.name.toLowerCase() === name.toLowerCase());
}

function hasTopic(analysis: LlmAnalysis, name: string): boolean {
  return analysis.topics.some((topic) => topic.name.toLowerCase() === name.toLowerCase());
}

function topicEvidenceText(context: AnalyzeContext, analysis: LlmAnalysis): string {
  return [
    context.title,
    context.description,
    context.textContent?.slice(0, 4000),
    ...analysis.nodes.map((node) => `${node.name} ${node.description}`),
  ].join(" ").toLowerCase();
}

function isContainerTopic(name: string): boolean {
  return containerTopics.has(name.toLowerCase());
}

function hasNode(analysis: LlmAnalysis, name: string): boolean {
  const key = slugifyNodeName(name);
  return analysis.nodes.some((node) => slugifyNodeName(node.name) === key);
}

function ensureDomainNodeCoverage(analysis: LlmAnalysis, matched: ReturnType<typeof classifyTextToLccTopic>): LlmAnalysis {
  if (!matched?.rule.nodeHints?.length) return analysis;
  const nodes = [...analysis.nodes];
  for (const hint of matched.rule.nodeHints) {
    if (hasNode({ ...analysis, nodes }, hint.name)) continue;
    nodes.unshift({
      type: hint.type,
      name: hint.name,
      description: hint.description,
      relevance: 0.82,
      claims: [`This reference has strong ${hint.name.toLowerCase()} signals.`],
      evidence: [],
    });
  }
  return { ...analysis, nodes: nodes.slice(0, 6) };
}

export function ensureDomainTopicCoverage(url: string, context: AnalyzeContext, analysis: LlmAnalysis): LlmAnalysis {
  const next: LlmAnalysis = { ...analysis, topics: [...analysis.topics] };
  const matched = classifyTextToLccTopic(context, next);
  const withNodes = ensureDomainNodeCoverage(next, matched);
  next.nodes = withNodes.nodes;
  if (matched && !hasTopic(next, matched.topic.name)) {
    const domainTopic = {
      ...toLccTopicAnalysis(matched),
      evidence: context.title ? [{ quote: context.title.slice(0, 280), source: "title" as const }] : [],
    };
    const nonDuplicate = next.topics.filter((topic) => topic.name.toLowerCase() !== matched.topic.name.toLowerCase());
    const highValueExisting = nonDuplicate.filter((topic) => isLccTopic(topic.name) && (!isContainerTopic(topic.name) || topic.confidence >= 0.75));
    next.topics = [domainTopic, ...highValueExisting].slice(0, 2);
  }
  next.topics = next.topics.filter((topic) => isLccTopic(topic.name)).slice(0, 2);
  if (next.topics.length > 0) return next;
  const domain = getDomain(url);
  const anchor = next.nodes.find((node) => node.type === "Technology" || node.type === "Concept" || node.type === "Project")?.name;
  const name = "General Works";
  return {
    ...next,
    topics: [{
      name,
      description: "Library of Congress class A: general works, encyclopedias, periodicals, and broad reference works.",
      confidence: 0.55,
      claims: [`${domain} was saved as a general reference${anchor ? ` related to ${anchor}` : ""}.`],
      evidence: context.description ? [{ quote: context.description.slice(0, 280), source: "description" as const }] : [],
    }],
  };
}

export async function analyzeUrl(url: string, context: AnalyzeContext = {}): Promise<LlmAnalysis> {
  const settings = await getAiSettings();
  if (!settings.apiKey && !process.env.OPENAI_API_KEY) return ensureDomainTopicCoverage(url, context, fallbackAnalysisForUrl(url, context));

  try {
    return ensureDomainTopicCoverage(url, context, await analyzeWithOpenAI(url, context));
  } catch {
    return ensureDomainTopicCoverage(url, context, fallbackAnalysisForUrl(url, context));
  }
}

export async function getAnalysisProviderName(): Promise<"openai" | "fallback"> {
  const settings = await getAiSettings();
  return settings.apiKey || process.env.OPENAI_API_KEY ? "openai" : "fallback";
}
