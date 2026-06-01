import { describe, expect, it, vi } from "vitest";
import type { Topic, WikiNode } from "@/lib/store/types";
import { findLocalNodeMatch, findLocalTopicMatch, reconcileNodeName, reconcileTopicName } from "@/lib/taxonomy/reconcile";

vi.mock("@/lib/taxonomy/wikidata", () => ({
  findWikidataMatch: vi.fn(async (query: string) => query === "home server" ? {
    id: "Q123",
    label: "Self-hosting",
    description: "hosting services on user-controlled infrastructure",
    aliases: ["home server", "homelab"],
    url: "https://www.wikidata.org/wiki/Q123",
  } : null),
}));

const baseTopic: Topic = { id: "topic_1", name: "Self-hosting", slug: "self-hosting", description: "Personal infrastructure", aliases: ["homelab"], createdAt: "now", updatedAt: "now" };
const baseNode: WikiNode = { id: "node_1", type: "Concept", name: "Reverse engineering", slug: "reverse-engineering", description: "Analysis", aliases: ["reversing"], createdAt: "now", updatedAt: "now" };

describe("taxonomy reconciliation", () => {
  it("matches local topic aliases", () => {
    expect(findLocalTopicMatch("homelab", [baseTopic])?.name).toBe("Self-hosting");
  });

  it("matches local node aliases", () => {
    expect(findLocalNodeMatch("reversing", [baseNode])?.name).toBe("Reverse engineering");
  });

  it("canonicalizes modern topic labels to LCC classes", async () => {
    const ai = await reconcileTopicName("AI and Machine Learning", []);
    expect(ai.name).toBe("Science");
    expect(ai.externalSource).toBe("lcc");
    expect(ai.externalId).toBe("lcc:Q");

    const wireless = await reconcileTopicName("Wireless Communication", []);
    expect(wireless.name).toBe("Technology");
    expect(wireless.externalSource).toBe("lcc");
    expect(wireless.externalId).toBe("lcc:T");
  });

  it("returns Wikidata canonical labels for new node names", async () => {
    const canonical = await reconcileNodeName("home server", []);
    expect(canonical.name).toBe("Self-hosting");
    expect(canonical.externalSource).toBe("wikidata");
    expect(canonical.externalId).toBe("Q123");
    expect(canonical.aliases).toContain("homelab");
  });
});
