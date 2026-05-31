import { beforeEach, describe, expect, it } from "vitest";
import { generateApiToken, revokeApiToken, verifyApiRequest } from "@/lib/apiAuth";
import { getSettings } from "@/lib/settings";

function requestWithToken(token: string) {
  return new Request("https://folium.test/api/status", { headers: { authorization: `Bearer ${token}` } });
}

describe("Agent API tokens", () => {
  beforeEach(async () => {
    await revokeApiToken();
  });
  it("keeps multiple generated tokens active with labels", async () => {
    const first = await generateApiToken("CLI");
    const second = await generateApiToken("Firefox clipper");
    const settings = await getSettings();

    expect(settings.api.tokens).toHaveLength(2);
    expect(settings.api.tokens?.map((token) => token.label)).toEqual(["CLI", "Firefox clipper"]);
    await expect(verifyApiRequest(requestWithToken(first.token))).resolves.toBe(true);
    await expect(verifyApiRequest(requestWithToken(second.token))).resolves.toBe(true);
  });

  it("revokes only the selected token", async () => {
    const first = await generateApiToken("CLI");
    const second = await generateApiToken("Firefox clipper");

    await revokeApiToken(first.id);

    await expect(verifyApiRequest(requestWithToken(first.token))).resolves.toBe(false);
    await expect(verifyApiRequest(requestWithToken(second.token))).resolves.toBe(true);
    expect((await getSettings()).api.tokens?.map((token) => token.id)).toEqual([second.id]);
  });
});
