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
    expect(prompt).toContain("Existing topics:");
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

    expect(result.topics.map((topic) => topic.name)).toContain("Music and Musicology");
    expect(result.topics[0]?.name).toBe("Music and Musicology");
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

    expect(result.topics[0]?.name).toBe("Mathematics");
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

    expect(result.topics[0]?.name).toBe("Philosophy");
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
});
