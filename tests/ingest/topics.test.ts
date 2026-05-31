import { describe, expect, it } from "vitest";
import { parseLlmAnalysis } from "@/lib/ingest/llm";

describe("LLM topic parsing", () => {
  it("accepts topic clusters alongside nodes", () => {
    const result = parseLlmAnalysis(JSON.stringify({
      summary: "A security learning platform.",
      topics: [
        { name: "Cybersecurity", description: "Hacking practice and security learning.", confidence: 0.91 }
      ],
      nodes: [
        { type: "Project", name: "Root-Me", description: "Security learning platform.", relevance: 0.9 }
      ]
    }));

    expect(result.topics).toHaveLength(1);
    expect(result.topics[0]?.name).toBe("Cybersecurity");
  });

  it("filters invalid and weak topic confidence values", () => {
    const result = parseLlmAnalysis(JSON.stringify({
      summary: "Summary.",
      topics: [
        { name: "Valid", description: "Valid topic", confidence: 0.5 },
        { name: "Weak", description: "Weak topic", confidence: 0.22 },
        { name: "Invalid", description: "Invalid topic", confidence: 2 }
      ],
      nodes: []
    }));

    expect(result.topics.map((topic) => topic.name)).toEqual(["Valid"]);
  });
});
