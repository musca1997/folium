export type BlockStatus = "pending" | "fetching" | "screenshotting" | "thinking" | "indexed" | "failed";
export type BlockVisibility = "public" | "private";

export type NodeType = "Concept" | "Project" | "Source" | "Technology" | "Person" | "Work" | "Question" | "Aesthetic";

export type CurationState = {
  hidden: boolean;
  favorite: boolean;
  needsReview: boolean;
  updatedAt: string | null;
};

export type EvidenceSnippet = {
  quote: string;
  source: "title" | "description" | "text";
};

export type BlockNodeLink = {
  nodeId: string;
  relevance: number;
  reason: string;
  evidence?: EvidenceSnippet[];
  claims?: string[];
};

export type BlockTopicLink = {
  topicId: string;
  confidence: number;
  reason: string;
  evidence?: EvidenceSnippet[];
  claims?: string[];
};

export type SummaryTranslations = {
  zh?: string;
};

export type Block = {
  id: string;
  type: "url";
  url: string;
  domain: string;
  title: string;
  summary: string;
  summaryTranslations?: SummaryTranslations;
  contentText: string;
  contentHtml: string;
  status: BlockStatus;
  screenshotPath: string | null;
  previewImage: string | null;
  favicon: string | null;
  description: string;
  metadata: Record<string, unknown>;
  visibility: BlockVisibility;
  nodeLinks: BlockNodeLink[];
  topicLinks: BlockTopicLink[];
  createdAt: string;
  updatedAt: string;
  curation?: CurationState;
};

export type WikiNode = {
  id: string;
  type: NodeType;
  name: string;
  slug: string;
  description: string;
  aliases?: string[];
  externalSource?: "wikidata" | "local" | "llm" | "lcc";
  externalId?: string;
  externalUrl?: string;
  createdAt: string;
  updatedAt: string;
  curation?: CurationState;
};

export type Topic = {
  id: string;
  name: string;
  slug: string;
  description: string;
  aliases?: string[];
  externalSource?: "wikidata" | "local" | "llm" | "lcc";
  externalId?: string;
  externalUrl?: string;
  createdAt: string;
  updatedAt: string;
  curation?: CurationState;
};

export type JobStatus = "queued" | "running" | "done" | "failed";
export type JobType = "process_block" | "analyze_block" | "recapture_block";

export type JobErrorHistoryEntry = {
  at: string;
  message: string;
  attempt: number;
};

export type Job = {
  id: string;
  type: JobType;
  blockId: string;
  status: JobStatus;
  error: string | null;
  attempts?: number;
  maxAttempts?: number;
  claimedAt?: string | null;
  lastError?: string | null;
  lastErrorAt?: string | null;
  errorHistory?: JobErrorHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type LibraryData = {
  blocks: Block[];
  nodes: WikiNode[];
  topics: Topic[];
  jobs: Job[];
};
