import { getAiSettings } from "@/lib/settings";
import { parseLlmAnalysis, type LlmAnalysis } from "./llm";
import { getDomain } from "./url";

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
  const topicCatalog = (context.existingTopics ?? []).slice(0, 120).map((topic) => `- ${topic.name}${topic.description ? `: ${topic.description}` : ""}`).join("\n");
  const nodeCatalog = (context.existingNodes ?? []).slice(0, 180).map((node) => `- ${node.name}${node.type ? ` (${node.type})` : ""}${node.description ? `: ${node.description}` : ""}`).join("\n");
  return `You are the AI librarian for Folium, a self-hosted visual knowledge library.
Analyze this saved web reference and classify it into topic clusters plus free graph wiki nodes.

Return only JSON. Do not wrap it in markdown. Do not add commentary.
The JSON shape must be:
{
  "summary": "one or two concise sentences",
  "topics": [
    {
      "name": "broad human-meaningful topic cluster, e.g. Cybersecurity, Visual Research, Self-hosting, Game Archives",
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

Existing taxonomy in this library. Reuse these exact names when they fit.

Existing topics:
${topicCatalog || "- None yet"}

Existing nodes:
${nodeCatalog || "- None yet"}

Rules:
- Before creating a new topic or node, check the existing taxonomy above.
- Prefer reusing an existing topic/node exact name if it is semantically close, even if the wording is not perfect.
- Only create a new topic/node when none of the existing names fit well.
- Do not create near-duplicates, plural variants, casing variants, or narrower synonyms of existing names.
- Prefer 1 to 2 broad topic clusters that could group many future links.
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

type DomainTopicRule = {
  name: string;
  description: string;
  pattern: RegExp;
};

const containerTopics = new Set([
  "web curation",
  "personal blogs and web publishing",
  "visual research",
  "creative coding",
  "software development workflows",
  "online communities",
]);

const domainTopicRules: DomainTopicRule[] = [
  { name: "Wireless Communication", description: "Radio systems, mesh networks, LoRa, off-grid messaging, and resilient communication infrastructure.", pattern: /\b(wireless communication|radio|lora|meshtastic|meshcore|mesh networking|mesh network|off-grid communication|emergency communication|radio network|rf|ham radio|amateur radio|packet radio|cn470|470mhz|480mhz)\b/ },
  { name: "Hardware and Electronics", description: "Electronics, embedded systems, microcontrollers, devices, sensors, repair, and physical computing hardware.", pattern: /\b(hardware|electronics|embedded|microcontroller|esp32|arduino|raspberry pi|pcb|soldering|sensor|sensors|battery|solar|module|firmware|tinylora|m5stack|lora module|circuit|device build)\b/ },
  { name: "Music and Musicology", description: "Music culture, composition, instruments, sound practices, and computational or historical music research.", pattern: /\b(music|musical|musicology|musicologist|composer|composition|instrument|luthier|guitar|score|scores|sound|sonic|electronic music|k-pop|song|songs)\b/ },
  { name: "Mathematics", description: "Mathematical ideas, proofs, structures, fields, education, and mathematical culture.", pattern: /\b(mathematics|math|mathematical|algebra|topology|geometry|calculus|probability|statistics|combinatorics|graph theory|number theory|proof|theorem|category theory)\b/ },
  { name: "Philosophy", description: "Philosophical traditions, arguments, thinkers, metaphysics, ethics, epistemology, and critical theory.", pattern: /\b(philosophy|philosopher|philosophical|metaphysics|epistemology|ethics|ontology|nihilism|posthumanism|accelerationism|phenomenology|critical theory|anti-humanism)\b/ },
  { name: "Cybersecurity", description: "Security research, hacking practice, vulnerability learning, privacy, and defensive or offensive security tools.", pattern: /\b(cybersecurity|hacking|infosec|vulnerability|exploit|ctf|malware|phishing|cryptography|penetration testing|xss|sql injection|threat model|reverse engineering)\b/ },
  { name: "Game Development", description: "Game design, game engines, interactive systems, homebrew games, and playable software projects.", pattern: /\b(game development|game design|game engine|games|gameplay|homebrew app|emulator|emulation|rom|nintendo|switch|wii u|unity|godot|unreal)\b/ },
  { name: "Self-hosting", description: "Personal infrastructure, home servers, deployment, networking, and locally operated software.", pattern: /\b(self-hosting|self hosting|home server|homelab|docker|nginx|caddy|tailscale|nas|reverse proxy|systemd|vps|kubernetes|postgres|matrix server)\b/ },
  { name: "AI and Machine Learning", description: "Artificial intelligence, machine learning systems, language models, agents, datasets, and AI-assisted workflows.", pattern: /\b(ai|artificial intelligence|machine learning|llm|language model|neural network|transformer|agent|agents|rag|embedding|embeddings|dataset|inference|fine-tuning|pretraining|mixture of experts)\b/ },
  { name: "Software Development", description: "Programming, developer tools, software architecture, code repositories, languages, and engineering workflows.", pattern: /\b(software development|programming|developer tool|developer tools|code|coding|library|framework|api|sdk|typescript|javascript|python|rust|go programming|github repository|open source software|package manager)\b/ },
  { name: "Art and Visual Culture", description: "Art, images, visual research, aesthetics, media artifacts, and visual cultural references.", pattern: /\b(art|artist|visual culture|aesthetic|image|images|photography|film|cinema|video art|painting|gallery|exhibition|illustration|graphic design)\b/ },
  { name: "Design", description: "Interface design, product design, typography, interaction, visual systems, and design practice.", pattern: /\b(design|designer|typography|interface design|interaction design|product design|ux|ui design|visual design|design system|layout|branding)\b/ },
  { name: "Archives and Databases", description: "Directories, archives, datasets, catalogs, repositories, and structured collections of reusable references.", pattern: /\b(archive|archives|database|dataset|directory|catalog|repository|collection|index|bibliography|resources|metadata|spreadsheet)\b/ },
  { name: "Education and Learning", description: "Learning resources, tutorials, courses, pedagogy, study notes, and knowledge-building practices.", pattern: /\b(education|learning|tutorial|course|curriculum|study|teaching|pedagogy|textbook|lesson|practice|challenge|lecture|workshop)\b/ },
  { name: "Literature and Writing", description: "Writing, essays, fiction, poetry, publishing, literary culture, and textual craft.", pattern: /\b(literature|writing|essay|essays|fiction|poetry|novel|short story|zine|publishing|writer|literary|prose|memoir)\b/ },
  { name: "Media Studies", description: "Media platforms, internet culture, film, video, fandom, journalism, and cultural analysis of media systems.", pattern: /\b(media studies|internet culture|journalism|platform|social media|fandom|meme|memes|youtube|tiktok|television|streaming|broadcast|press)\b/ },
  { name: "Politics and Society", description: "Politics, institutions, social movements, governance, public policy, and social analysis.", pattern: /\b(politics|political|society|social movement|governance|policy|public policy|state|government|institution|democracy|activism|labor|economics)\b/ },
  { name: "Science and Research", description: "Scientific research, papers, experiments, methods, laboratories, and scholarly knowledge outside narrower domains.", pattern: /\b(science|scientific|research|paper|papers|experiment|laboratory|biology|physics|chemistry|astronomy|neuroscience|methodology|peer review)\b/ },
  { name: "Future Studies", description: "Speculative futures, foresight, long-term scenarios, technology futures, and future-oriented cultural analysis.", pattern: /\b(future studies|futures|foresight|scenario planning|speculative future|longtermism|singularity|post-scarcity|techno-utopian|dystopia)\b/ },
];

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

export function ensureDomainTopicCoverage(url: string, context: AnalyzeContext, analysis: LlmAnalysis): LlmAnalysis {
  const next: LlmAnalysis = { ...analysis, topics: [...analysis.topics] };
  const haystack = topicEvidenceText(context, next);
  const matched = domainTopicRules.find((rule) => rule.pattern.test(haystack));
  if (matched && !hasTopic(next, matched.name)) {
    const domainTopic = {
      name: matched.name,
      description: matched.description,
      confidence: 0.82,
      claims: [`This reference has strong ${matched.name.toLowerCase()} signals in its title, text, or extracted nodes.`],
      evidence: context.title ? [{ quote: context.title.slice(0, 280), source: "title" as const }] : [],
    };
    const nonDuplicate = next.topics.filter((topic) => topic.name.toLowerCase() !== matched.name.toLowerCase());
    const highValueExisting = nonDuplicate.filter((topic) => !isContainerTopic(topic.name) || topic.confidence >= 0.75);
    next.topics = [domainTopic, ...highValueExisting].slice(0, 2);
  }
  if (next.topics.length > 0) return next;
  const domain = getDomain(url);
  const anchor = next.nodes.find((node) => node.type === "Technology" || node.type === "Concept" || node.type === "Project")?.name;
  const name = anchor || "Web Curation";
  return {
    ...next,
    topics: [{
      name,
      description: anchor ? `Saved references related to ${anchor}.` : "Saved web references and link organization.",
      confidence: 0.55,
      claims: [`${domain} was saved as a reference related to ${name}.`],
      evidence: context.description ? [{ quote: context.description.slice(0, 280), source: "description" as const }] : [],
    }],
  };
}

export async function analyzeUrl(url: string, context: AnalyzeContext = {}): Promise<LlmAnalysis> {
  const settings = await getAiSettings();
  if (!settings.apiKey && !process.env.OPENAI_API_KEY) return fallbackAnalysisForUrl(url, context);

  try {
    return ensureDomainTopicCoverage(url, context, await analyzeWithOpenAI(url, context));
  } catch {
    return fallbackAnalysisForUrl(url, context);
  }
}

export async function getAnalysisProviderName(): Promise<"openai" | "fallback"> {
  const settings = await getAiSettings();
  return settings.apiKey || process.env.OPENAI_API_KEY ? "openai" : "fallback";
}
