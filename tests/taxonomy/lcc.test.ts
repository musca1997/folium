import { describe, expect, it } from "vitest";
import { classifyTextToLccTopic, findLccTopicByName, lccCanonicalTopics } from "@/lib/taxonomy/lcc";

describe("LCC canonical topic registry", () => {
  it("contains the Library of Congress top-level classes", () => {
    expect(lccCanonicalTopics).toHaveLength(21);
    expect(lccCanonicalTopics.map((topic) => topic.code)).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "U", "V", "Z"]);
    expect(lccCanonicalTopics.map((topic) => topic.name)).not.toContain("AI and Machine Learning");
    expect(lccCanonicalTopics.map((topic) => topic.name)).not.toContain("Wireless Communication");
  });

  it("resolves modern aliases to canonical LCC classes", () => {
    expect(findLccTopicByName("AI and Machine Learning")?.name).toBe("Science");
    expect(findLccTopicByName("Machine Learning")?.name).toBe("Science");
    expect(findLccTopicByName("Wireless Communication")?.name).toBe("Technology");
    expect(findLccTopicByName("Design")?.name).toBe("Fine Arts");
    expect(findLccTopicByName("Databases")?.name).toBe("Bibliography, Library Science, Information Resources");
  });

  it("classifies AI and language model material as Science", () => {
    const result = classifyTextToLccTopic({
      title: "Language model interpretability and neural network activations",
      textContent: "AI machine learning transformer language model research",
    });

    expect(result?.topic.name).toBe("Science");
    expect(result?.rule.subclassHint).toBe("QA");
  });

  it("classifies LoRa and embedded electronics as Technology", () => {
    const result = classifyTextToLccTopic({
      title: "Meshtastic LoRa solar node",
      textContent: "wireless radio electronics ESP32 embedded firmware",
    });

    expect(result?.topic.name).toBe("Technology");
    expect(result?.rule.subclassHint).toBe("TK");
  });
});
