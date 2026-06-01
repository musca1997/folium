import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeUrl, buildAnalysisPrompt, ensureDomainTopicCoverage } from "@/lib/ingest/process";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("buildAnalysisPrompt", () => {
  it("asks for strict JSON with summary and nodes", () => {
    const prompt = buildAnalysisPrompt("https://example.com/a", {
      title: "A visual library",
      description: "An article about AI curation.",
      textContent: "Digital gardens and visual bookmarking are related.",
    });

    expect(prompt).toContain("Return only JSON");
    expect(prompt).toContain("summary");
    expect(prompt).toContain("nodes");
    expect(prompt).toContain("Canonical topics:");
    expect(prompt).toContain("Library of Congress");
    expect(prompt).toContain("Digital gardens");
  });
});

describe("ensureDomainTopicCoverage", () => {
  it("adds a music topic for clearly musical references when LLM topics miss it", () => {
    const result = ensureDomainTopicCoverage("https://example.com/music", {
      title: "MusoRepo: a Directory of Resources for Computational Musicology",
      description: "A directory of resources for computational musicology.",
      textContent: "symbolic scores musicology music21 MEI musical resources",
    }, {
      summary: "A musicology resource directory.",
      topics: [{ name: "Web Curation", description: "Curated link directories.", confidence: 0.94, claims: [], evidence: [] }],
      nodes: [{ type: "Concept", name: "Computational musicology", description: "Music research with computation.", relevance: 0.9, claims: [], evidence: [] }],
    });

    expect(result.topics.map((topic) => topic.name)).toContain("Music");
    expect(result.topics[0]?.name).toBe("Music");
  });

  it("promotes mathematics over container topics", () => {
    const result = ensureDomainTopicCoverage("https://example.com/math", {
      title: "A reflection on algebra, topology, and mathematical learning",
      textContent: "linear algebra graph theory abstract algebra topology probability proof theorem mathematics",
    }, {
      summary: "A post about mathematical learning.",
      topics: [{ name: "Personal blogs and web publishing", description: "Personal essays.", confidence: 0.88, claims: [], evidence: [] }],
      nodes: [{ type: "Concept", name: "Abstract algebra", description: "A field of mathematics.", relevance: 0.9, claims: [], evidence: [] }],
    });

    expect(result.topics[0]?.name).toBe("Science");
  });

  it("promotes philosophy over future studies when philosophy evidence is stronger", () => {
    const result = ensureDomainTopicCoverage("https://example.com/philosophy", {
      title: "Summary of Nick Land's philosophy",
      textContent: "philosophy posthumanism accelerationism nihilism metaphysics anti-humanism Nick Land",
    }, {
      summary: "A philosophical summary.",
      topics: [{ name: "Future studies", description: "Speculative futures.", confidence: 0.76, claims: [], evidence: [] }],
      nodes: [{ type: "Person", name: "Nick Land", description: "Philosopher.", relevance: 0.9, claims: [], evidence: [] }],
    });

    expect(result.topics[0]?.name).toBe("Philosophy, Psychology, Religion");
  });

  it("does not promote music for AI papers that mention scores", () => {
    const result = ensureDomainTopicCoverage("https://www.anthropic.com/research/natural-language-autoencoders", {
      title: "Natural Language Autoencoders",
      description: "Turning Claude's thoughts into text",
      textContent: "AI model Claude activations language models interpretability. We score the NLA on how similar the reconstructed activation is to the original.",
    }, {
      summary: "An AI interpretability paper.",
      topics: [{ name: "AI and Machine Learning", description: "AI research.", confidence: 0.98, claims: [], evidence: [] }],
      nodes: [{ type: "Technology", name: "Claude", description: "Language model.", relevance: 0.9, claims: [], evidence: [] }],
    });

    expect(result.topics.map((topic) => topic.name)).not.toContain("Music");
    expect(result.topics[0]?.name).toBe("Science");
  });

  it("promotes science for language model courses", () => {
    const result = ensureDomainTopicCoverage("https://www.youtube.com/playlist", {
      title: "Stanford CS336: Language Modeling from Scratch | Spring 2026",
      description: "A course about language models.",
      textContent: "language models transformer pretraining inference neural networks datasets tokenization",
    }, {
      summary: "A course playlist.",
      topics: [{ name: "Web Curation", description: "Saved web references.", confidence: 0.7, claims: [], evidence: [] }],
      nodes: [{ type: "Source", name: "YouTube", description: "Video platform.", relevance: 0.7, claims: [], evidence: [] }],
    });

    expect(result.topics[0]?.name).toBe("Science");
  });

  it("promotes wireless communication for LoRa mesh communities", () => {
    const result = ensureDomainTopicCoverage("https://meshcn.net", {
      title: "MeshCN - Meshtastic 中国社区",
      description: "在中国建立太阳能供电的 Meshtastic 无线电网络。",
      textContent: "LoRa communication network Meshtastic mesh networking off-grid emergency communication solar nodes",
    }, {
      summary: "A Meshtastic community site.",
      topics: [
        { name: "Self-hosting", description: "Personal infrastructure.", confidence: 0.6, claims: [], evidence: [] },
        { name: "Cybersecurity", description: "Security topics.", confidence: 0.52, claims: [], evidence: [] },
      ],
      nodes: [
        { type: "Technology", name: "Meshtastic", description: "LoRa mesh communication technology.", relevance: 0.94, claims: [], evidence: [] },
        { type: "Technology", name: "LoRa", description: "Long-range radio technology.", relevance: 0.9, claims: [], evidence: [] },
      ],
    });

    expect(result.topics[0]?.name).toBe("Technology");
  });

  it("promotes hardware and electronics for embedded device projects", () => {
    const result = ensureDomainTopicCoverage("https://example.com/device", {
      title: "TinyLora V3 solar ESP32 node build",
      textContent: "embedded hardware ESP32 microcontroller PCB soldering battery solar sensor module electronics",
    }, {
      summary: "A hardware build guide.",
      topics: [{ name: "Tutorials", description: "Guides.", confidence: 0.7, claims: [], evidence: [] }],
      nodes: [{ type: "Technology", name: "ESP32", description: "Microcontroller hardware.", relevance: 0.9, claims: [], evidence: [] }],
    });

    expect(result.topics[0]?.name).toBe("Technology");
  });
});

describe("analyzeUrl", () => {
  it("uses OpenAI-compatible chat completions when an API key is configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summary: "AI summary",
                    nodes: [{ type: "Concept", name: "AI Curation", description: "Automated organizing", relevance: 0.8 }],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const result = await analyzeUrl("https://example.com/a", { title: "Title" });

    expect(result.summary).toBe("AI summary");
    expect(result.nodes[0]?.name).toBe("AI Curation");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("falls back when provider request fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));

    const result = await analyzeUrl("https://example.com/a", { description: "Fallback description" });

    expect(result.summary).toBe("Fallback description");
    expect(result.nodes.length).toBeGreaterThan(0);
  });

  it("still applies domain coverage when provider request falls back", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));

    const result = await analyzeUrl("https://meshcn.net", {
      title: "MeshCN - Meshtastic 中国社区",
      description: "LoRa mesh networking and Meshtastic off-grid communication.",
      textContent: "Meshtastic LoRa mesh networking off-grid emergency communication solar nodes",
    });

    expect(result.topics[0]?.name).toBe("Technology");
  });
});
