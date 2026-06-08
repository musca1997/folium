import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadAppEnv } from "@/lib/env/loadAppEnv";

describe("loadAppEnv", () => {
  it("loads local Next-style environment files for non-Next worker scripts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "folium-env-"));
    const key = `FOLIUM_TEST_ENV_${crypto.randomUUID().replaceAll("-", "_")}`;
    const previous = process.env[key];
    delete process.env[key];

    try {
      await writeFile(join(dir, ".env.test.local"), `${key}=loaded-from-env-test-local\n`, "utf8");
      loadAppEnv(dir);
      expect(process.env[key]).toBe("loaded-from-env-test-local");
    } finally {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
      await rm(dir, { recursive: true, force: true });
    }
  });
});
