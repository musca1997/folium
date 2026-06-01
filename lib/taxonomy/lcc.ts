import { slugifyNodeName } from "@/lib/ingest/url";
import type { LlmAnalysis } from "@/lib/ingest/llm";
import type { NodeType } from "@/lib/store/types";

export type LccClassCode = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "J" | "K" | "L" | "M" | "N" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "Z";

export type LccCanonicalTopic = {
  code: LccClassCode;
  name: string;
  slug: string;
  description: string;
  aliases: string[];
  externalUrl: string;
};

export type LccNodeHint = {
  type: NodeType;
  name: string;
  description: string;
};

export type LccDomainRule = {
  code: LccClassCode;
  description: string;
  patterns: RegExp[];
  minMatches?: number;
  subclassHint?: string;
  nodeHints?: LccNodeHint[];
};

const LCC_OUTLINE_URL = "https://www.loc.gov/catdir/cpso/lcco/";

export const lccCanonicalTopics: LccCanonicalTopic[] = [
  { code: "A", name: "General Works", slug: "general-works", description: "Library of Congress class A: general works, encyclopedias, periodicals, and broad reference works.", aliases: ["general reference", "reference works", "encyclopedias", "periodicals"], externalUrl: LCC_OUTLINE_URL },
  { code: "B", name: "Philosophy, Psychology, Religion", slug: "philosophy-psychology-religion", description: "Library of Congress class B: philosophy, psychology, religion, ethics, and related traditions.", aliases: ["philosophy", "psychology", "religion", "ethics", "metaphysics", "epistemology", "phenomenology"], externalUrl: LCC_OUTLINE_URL },
  { code: "C", name: "Auxiliary Sciences of History", slug: "auxiliary-sciences-of-history", description: "Library of Congress class C: historical method, archaeology, genealogy, biography, and auxiliary sciences of history.", aliases: ["archaeology", "genealogy", "biography", "historical method", "archives history"], externalUrl: LCC_OUTLINE_URL },
  { code: "D", name: "World History", slug: "world-history", description: "Library of Congress class D: world history and the history of Europe, Asia, Africa, Australia, New Zealand, and related regions.", aliases: ["history", "world history", "european history", "asian history", "african history", "australian history"], externalUrl: LCC_OUTLINE_URL },
  { code: "E", name: "History of the Americas", slug: "history-of-the-americas", description: "Library of Congress class E: general history of the Americas and United States history.", aliases: ["american history", "united states history", "americas"], externalUrl: LCC_OUTLINE_URL },
  { code: "F", name: "Local History of the Americas", slug: "local-history-of-the-americas", description: "Library of Congress class F: local history of the Americas.", aliases: ["local history", "canadian history", "latin american history", "regional history"], externalUrl: LCC_OUTLINE_URL },
  { code: "G", name: "Geography, Anthropology, Recreation", slug: "geography-anthropology-recreation", description: "Library of Congress class G: geography, maps, anthropology, recreation, games, and leisure.", aliases: ["geography", "anthropology", "recreation", "maps", "cartography", "games", "game development", "sports", "travel"], externalUrl: LCC_OUTLINE_URL },
  { code: "H", name: "Social Sciences", slug: "social-sciences", description: "Library of Congress class H: social sciences, economics, sociology, commerce, and social analysis.", aliases: ["social sciences", "sociology", "economics", "commerce", "business", "society", "labor", "finance"], externalUrl: LCC_OUTLINE_URL },
  { code: "J", name: "Political Science", slug: "political-science", description: "Library of Congress class J: political science, public administration, and government.", aliases: ["politics", "political science", "government", "public administration", "policy", "governance", "democracy"], externalUrl: LCC_OUTLINE_URL },
  { code: "K", name: "Law", slug: "law", description: "Library of Congress class K: law and legal systems.", aliases: ["law", "legal", "legislation", "jurisprudence", "regulation"], externalUrl: LCC_OUTLINE_URL },
  { code: "L", name: "Education", slug: "education", description: "Library of Congress class L: education, pedagogy, teaching, learning, courses, and schools.", aliases: ["education", "learning", "teaching", "course", "courses", "curriculum", "pedagogy", "lecture", "workshop", "study"], externalUrl: LCC_OUTLINE_URL },
  { code: "M", name: "Music", slug: "music", description: "Library of Congress class M: music, musicology, instruments, composition, and music culture.", aliases: ["music", "musicology", "musical", "composer", "song", "songs", "instrument", "electronic music", "k-pop", "sound art"], externalUrl: LCC_OUTLINE_URL },
  { code: "N", name: "Fine Arts", slug: "fine-arts", description: "Library of Congress class N: visual arts, fine arts, design, architecture, images, and art history.", aliases: ["art", "fine arts", "visual culture", "design", "typography", "photography", "painting", "architecture", "aesthetics", "graphic design"], externalUrl: LCC_OUTLINE_URL },
  { code: "P", name: "Language and Literature", slug: "language-and-literature", description: "Library of Congress class P: language, linguistics, literature, writing, fiction, and textual culture.", aliases: ["language", "literature", "writing", "linguistics", "fiction", "poetry", "novel", "essay", "prose", "publishing"], externalUrl: LCC_OUTLINE_URL },
  { code: "Q", name: "Science", slug: "science", description: "Library of Congress class Q: science, mathematics, computer science, natural sciences, and scientific research.", aliases: ["science", "scientific research", "mathematics", "math", "computer science", "ai", "ai and machine learning", "artificial intelligence", "machine learning", "llm", "llms", "language models", "neural networks", "physics", "biology", "chemistry", "astronomy"], externalUrl: LCC_OUTLINE_URL },
  { code: "R", name: "Medicine", slug: "medicine", description: "Library of Congress class R: medicine, health, clinical practice, public health, and biomedical knowledge.", aliases: ["medicine", "medical", "health", "healthcare", "clinical", "public health", "biomedicine"], externalUrl: LCC_OUTLINE_URL },
  { code: "S", name: "Agriculture", slug: "agriculture", description: "Library of Congress class S: agriculture, plants, animals, forestry, and animal culture.", aliases: ["agriculture", "farming", "forestry", "plants", "animals", "gardening"], externalUrl: LCC_OUTLINE_URL },
  { code: "T", name: "Technology", slug: "technology", description: "Library of Congress class T: technology, engineering, electronics, manufacturing, infrastructure, and applied technical systems.", aliases: ["technology", "engineering", "electronics", "hardware", "software development", "programming", "cybersecurity", "self-hosting", "wireless communication", "lora", "meshtastic", "embedded systems", "industrial design"], externalUrl: LCC_OUTLINE_URL },
  { code: "U", name: "Military Science", slug: "military-science", description: "Library of Congress class U: military science and land warfare.", aliases: ["military", "military science", "warfare", "army"], externalUrl: LCC_OUTLINE_URL },
  { code: "V", name: "Naval Science", slug: "naval-science", description: "Library of Congress class V: naval science and maritime military affairs.", aliases: ["naval", "navy", "maritime military"], externalUrl: LCC_OUTLINE_URL },
  { code: "Z", name: "Bibliography, Library Science, Information Resources", slug: "bibliography-library-science-information-resources", description: "Library of Congress class Z: bibliography, library science, publishing, archives, catalogs, databases, and information resources.", aliases: ["bibliography", "library science", "information resources", "archives", "archive", "databases", "database", "catalog", "directory", "metadata", "repository", "collection"], externalUrl: LCC_OUTLINE_URL },
];

export const lccDomainRules: LccDomainRule[] = [
  { code: "Q", subclassHint: "QA", description: "Science, mathematics, computer science, AI, machine learning, and research.", patterns: [/\b(artificial intelligence|machine learning|llm|llms|language model|language models|neural network|neural networks|transformer|rag|embedding|embeddings|inference|fine-tuning|pretraining|mixture of experts|interpretability|activation|activations|mathematics|mathematical|algorithm|computer science|scientific|research paper)\b/], nodeHints: [{ type: "Concept", name: "AI and Machine Learning", description: "Artificial intelligence and machine learning systems, including language models, agents, datasets, inference, and model evaluation." }] },
  { code: "T", subclassHint: "TK", description: "Wireless communication, radio, mesh networking, and off-grid messaging.", patterns: [/\b(wireless communication|lora|meshtastic|meshcore|mesh networking|mesh network|off-grid communication|emergency communication|radio network|ham radio|amateur radio|packet radio)\b/], nodeHints: [{ type: "Technology", name: "Wireless Communication", description: "Radio, wireless, mesh, and off-grid communication systems." }] },
  { code: "T", subclassHint: "TK", description: "Hardware, electronics, embedded systems, and physical computing.", patterns: [/\b(hardware|electronics|embedded|microcontroller|esp32|arduino|raspberry pi|pcb|soldering|firmware|sensor|sensors|battery|solar)\b/], nodeHints: [{ type: "Technology", name: "Hardware and Electronics", description: "Electronics, embedded systems, microcontrollers, sensors, circuits, and physical computing hardware." }] },
  { code: "T", description: "Cybersecurity, hacking, vulnerabilities, privacy, and security tooling.", patterns: [/\b(cybersecurity|hacking|infosec|vulnerability|exploit|ctf|malware|phishing|cryptography|penetration testing|xss|sql injection|threat model|reverse engineering)\b/], nodeHints: [{ type: "Concept", name: "Cybersecurity", description: "Security research, vulnerability analysis, defensive and offensive security tools, privacy, and threat modeling." }] },
  { code: "T", description: "Self-hosting, homelab, deployment, networking, and personal infrastructure.", patterns: [/\b(self-hosting|self hosting|home server|homelab|docker|nginx|caddy|tailscale|nas|reverse proxy|systemd|vps|kubernetes|postgres|matrix server)\b/], nodeHints: [{ type: "Concept", name: "Self-hosting", description: "Running and maintaining software infrastructure on user-controlled systems." }] },
  { code: "T", description: "Software development, programming, developer tools, and engineering workflows.", patterns: [/\b(software development|programming|developer tool|developer tools|code|coding|framework|api|sdk|typescript|javascript|python|rust|go programming|github repository|open source software|package manager)\b/], nodeHints: [{ type: "Concept", name: "Software Development", description: "Programming, software engineering, developer tools, code repositories, libraries, and technical workflows." }] },
  { code: "M", description: "Music and musicology.", patterns: [/\b(music|musical|musicology|musicologist|composer|luthier|guitar|electronic music|k-pop|song|songs)\b/, /\b(musical instrument|music score|musical score|sheet music|sound art|sonic art|composition practice)\b/], nodeHints: [{ type: "Concept", name: "Musicology", description: "Study of music, musical culture, instruments, composition, and music history." }] },
  { code: "B", description: "Philosophy, psychology, religion, ethics, and critical traditions.", patterns: [/\b(philosophy|philosopher|philosophical|psychology|religion|metaphysics|epistemology|ethics|ontology|nihilism|posthumanism|accelerationism|phenomenology|critical theory|anti-humanism)\b/], nodeHints: [{ type: "Concept", name: "Philosophy", description: "Philosophical traditions, arguments, ethics, metaphysics, epistemology, and critical theory." }] },
  { code: "N", description: "Fine arts, design, visual culture, images, and aesthetics.", patterns: [/\b(fine arts|visual culture|aesthetic|photography|film|cinema|video art|painting|gallery|exhibition|illustration|graphic design|typography|interface design|interaction design|product design|visual design|design system)\b/], nodeHints: [{ type: "Concept", name: "Design", description: "Visual, interface, product, interaction, typography, and design-system practice." }] },
  { code: "Z", description: "Bibliography, library science, archives, databases, catalogs, directories, and information resources.", patterns: [/\b(archive|archives|database|dataset|directory|catalog|repository|collection|index|bibliography|metadata|spreadsheet|library science|information resources)\b/], nodeHints: [{ type: "Concept", name: "Archives and Databases", description: "Structured collections, archives, catalogs, databases, directories, bibliographies, and metadata resources." }] },
  { code: "L", description: "Education, learning, courses, pedagogy, lectures, and teaching resources.", patterns: [/\b(education|learning|tutorial|course|curriculum|study|teaching|pedagogy|textbook|lesson|lecture|workshop)\b/], nodeHints: [{ type: "Concept", name: "Education and Learning", description: "Courses, tutorials, pedagogy, teaching resources, study practices, and learning materials." }] },
  { code: "P", description: "Language, literature, writing, fiction, poetry, and publishing.", patterns: [/\b(language|linguistics|literature|writing|essay|essays|fiction|poetry|novel|short story|zine|publishing|writer|literary|prose|memoir)\b/], nodeHints: [{ type: "Concept", name: "Literature and Writing", description: "Literature, essays, fiction, poetry, publishing, language, and textual craft." }] },
  { code: "J", description: "Political science, government, policy, and governance.", patterns: [/\b(politics|political|governance|policy|public policy|state|government|institution|democracy|activism)\b/], nodeHints: [{ type: "Concept", name: "Politics and Society", description: "Politics, governance, institutions, public policy, activism, and social analysis." }] },
  { code: "H", description: "Social sciences, society, economics, labor, and social analysis.", patterns: [/\b(social sciences|society|social movement|sociology|economics|labor|commerce|business|finance)\b/], nodeHints: [{ type: "Concept", name: "Social Sciences", description: "Sociology, economics, labor, commerce, social movements, and social analysis." }] },
  { code: "G", description: "Geography, anthropology, recreation, games, maps, and leisure.", patterns: [/\b(geography|anthropology|map|maps|cartography|recreation|game development|game design|game engine|games|gameplay|sports|travel)\b/], nodeHints: [{ type: "Concept", name: "Games and Recreation", description: "Games, play, recreation, sports, travel, maps, and leisure cultures." }] },
];

function normalize(value: string): string {
  return slugifyNodeName(value);
}

export function lccTopicByCode(code: LccClassCode): LccCanonicalTopic {
  const topic = lccCanonicalTopics.find((item) => item.code === code);
  if (!topic) throw new Error(`Unknown LCC class code: ${code}`);
  return topic;
}

export function findLccTopicByName(name: string): LccCanonicalTopic | null {
  const key = normalize(name);
  return lccCanonicalTopics.find((topic) => topic.slug === key || normalize(topic.name) === key || topic.aliases.some((alias) => normalize(alias) === key)) ?? null;
}

export function lccTopicEvidenceText(context: { title?: string; description?: string; textContent?: string }, analysis?: LlmAnalysis): string {
  return [
    context.title,
    context.description,
    context.textContent?.slice(0, 4000),
    ...(analysis?.nodes ?? []).map((node) => `${node.name} ${node.description}`),
  ].join(" ").toLowerCase();
}

export function classifyTextToLccTopic(context: { title?: string; description?: string; textContent?: string }, analysis?: LlmAnalysis): { topic: LccCanonicalTopic; rule: LccDomainRule } | null {
  const haystack = lccTopicEvidenceText(context, analysis);
  const rule = lccDomainRules.find((candidate) => candidate.patterns.filter((pattern) => pattern.test(haystack)).length >= (candidate.minMatches ?? 1));
  return rule ? { topic: lccTopicByCode(rule.code), rule } : null;
}

export function toLccTopicAnalysis(match: { topic: LccCanonicalTopic; rule?: LccDomainRule }): LlmAnalysis["topics"][number] {
  return {
    name: match.topic.name,
    description: match.topic.description,
    confidence: 0.82,
    claims: [`This reference matches Library of Congress class ${match.topic.code} (${match.topic.name}).`],
    evidence: [],
  };
}

export function lccTopicCatalogForPrompt(): string {
  return lccCanonicalTopics.map((topic) => `${topic.code} — ${topic.name}: ${topic.description}`).join("\n");
}
