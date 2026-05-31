import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeUrl, buildAnalysisPrompt } from "@/lib/ingest/process";

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
