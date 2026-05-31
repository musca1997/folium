export type CoarseCategory = {
  name: string;
  description: string;
  keywords: string[];
};

export const COARSE_CATEGORIES: CoarseCategory[] = [
  {
    name: "Infrastructure & Self-hosting",
    description: "Homelab, NixOS, Linux, open-source services, personal servers, and web infrastructure.",
    keywords: ["self-host", "homelab", "nixos", "linux", "infrastructure", "server", "open source", "web infrastructure", "remote server", "declarative"],
  },
  {
    name: "Security & Reverse Engineering",
    description: "Cybersecurity, bug bounties, reverse engineering, cryptography, SDR, and protocol research.",
    keywords: ["cyber", "security", "bug", "reverse", "cryptography", "wireless", "radio", "sdr", "protocol", "hacking"],
  },
  {
    name: "Games & Retrocomputing",
    description: "Game archives, DOS games, homebrew, console modding, horror games, and software preservation.",
    keywords: ["game", "dos", "retro", "homebrew", "console", "freeware", "mod", "software preservation"],
  },
  {
    name: "Art, Visual Culture & Design",
    description: "Visual research, media art, publishing, fashion, film, screenprinting, and underground aesthetics.",
    keywords: ["visual", "art", "design", "fashion", "film", "publishing", "screenprinting", "aesthetic", "streetwear", "media art"],
  },
  {
    name: "Music & Audio",
    description: "Electronic music, music history, audio visualization, and oscilloscope music.",
    keywords: ["music", "audio", "oscilloscope", "electronic"],
  },
  {
    name: "Knowledge Systems & Archives",
    description: "Wikis, reference databases, web curation, archives, documents, knowledge maps, and research systems.",
    keywords: ["wiki", "archive", "reference", "curation", "knowledge", "document", "spreadsheet", "database", "map", "web archiving"],
  },
  {
    name: "Philosophy, Systems & Speculation",
    description: "Systems thinking, consciousness, future studies, mythology, institutions, and speculative research.",
    keywords: ["systems", "consciousness", "psychedelic", "future", "mythology", "gnostic", "institutional", "ethics", "transdisciplinary", "occult"],
  },
  {
    name: "Products, Platforms & Markets",
    description: "Product discovery, marketplaces, startup ecosystems, web platforms, and internet tools.",
    keywords: ["product", "market", "startup", "platform", "internet tool", "web platform", "marketplace", "tech trends"],
  },
  {
    name: "Transport & Infrastructure Records",
    description: "Aviation safety, transport systems, and infrastructure records.",
    keywords: ["aviation", "transport"],
  },
];

export function coarseCategoryForTopic(topicName: string): CoarseCategory {
  const value = topicName.toLowerCase();
  return (
    COARSE_CATEGORIES.find((category) => category.keywords.some((keyword) => value.includes(keyword))) ?? {
      name: "Miscellaneous Research",
      description: "Topics that do not yet fit a larger recurring category.",
      keywords: [],
    }
  );
}
