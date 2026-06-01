import { describe, expect, it } from "vitest";
import { parseLlmAnalysis } from "@/lib/ingest/llm";

describe("parseLlmAnalysis", () => {
  it("accepts structured JSON with summary and nodes", () => {
    const result = parseLlmAnalysis(
      JSON.stringify({
        summary: "A short summary.",
        nodes: [
          {
            type: "Concept",
            name: "Digital Garden",
            description: "A growing personal knowledge space.",
            relevance: 0.9,
          },
        ],
      }),
    );

    expect(result.summary).toBe("A short summary.");
    expect(result.summaryTranslations?.zh).toBeUndefined();
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.name).toBe("Digital Garden");
  });

  it("filters invalid node relevance values", () => {
    const result = parseLlmAnalysis(
      JSON.stringify({
        summary: "Summary.",
        nodes: [
          { type: "Concept", name: "Valid", relevance: 0.5 },
          { type: "Concept", name: "Too high", relevance: 2 },
          { type: "Concept", name: "Too low", relevance: -1 },
        ],
      }),
    );

    expect(result.nodes.map((node) => node.name)).toEqual(["Valid"]);
  });
});

it("parses optional claims and evidence while preserving old JSON compatibility", () => {
  const oldResult = parseLlmAnalysis(JSON.stringify({ summary: "Old", topics: [{ name: "Topic", confidence: 0.8 }] }));
  expect(oldResult.topics[0]?.claims).toEqual([]);
  expect(oldResult.topics[0]?.evidence).toEqual([]);

  const result = parseLlmAnalysis(JSON.stringify({
    summary: "Evidence",
    nodes: [{
      type: "Concept",
      name: "Grounded Link",
      relevance: 0.9,
      claims: ["  It is related.  ", "", "Two", "Three", "Four"],
      evidence: [{ quote: "x".repeat(400), source: "text" }, { quote: "Title quote", source: "title" }],
    }],
  }));
  expect(result.nodes[0]?.claims).toEqual(["It is related.", "Two", "Three"]);
  expect(result.nodes[0]?.evidence[0]?.quote).toHaveLength(280);
});

it("parses bilingual summaries from analysis JSON", () => {
  const result = parseLlmAnalysis(JSON.stringify({
    summary: "An English summary.",
    summaryZh: "一段中文摘要。",
    nodes: [],
    topics: [],
  }));

  expect(result.summary).toBe("An English summary.");
  expect(result.summaryTranslations?.zh).toBe("一段中文摘要。");
});
