import { loadEnvConfig } from "@next/env";

let loadedProjectDir: string | null = null;

function loadAppEnv(projectDir = process.cwd()): void {
  if (loadedProjectDir === projectDir) return;
  loadEnvConfig(projectDir);
  loadedProjectDir = projectDir;
}

export { loadAppEnv };
export default loadAppEnv;
