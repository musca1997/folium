import { describe, expect, it } from "vitest";
import { getSettings, updateSummaryLanguageSettings } from "@/lib/settings";

describe("summary language settings", () => {
  it("defaults to English-only summaries", async () => {
    const settings = await getSettings();

    expect(settings.summaryLanguages).toEqual({ enabled: false, preferred: "en" });
  });

  it("enables Chinese as the preferred translated summary language", async () => {
    const settings = await updateSummaryLanguageSettings({ enabled: true, preferred: "zh" });

    expect(settings.summaryLanguages).toMatchObject({ enabled: true, preferred: "zh" });
  });
});
