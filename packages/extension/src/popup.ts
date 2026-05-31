type FoliumConfig = {
  url?: string;
  token?: string;
  visibility?: "private" | "public";
};

type ClippedPage = {
  url: string;
  title: string;
  description: string;
  canonicalUrl: string;
  contentText: string;
  htmlContent: string;
  selectionText: string;
  previewImage: string | null;
  favicon: string | null;
};

const statusEl = document.getElementById("status") as HTMLDivElement;
const currentUrlEl = document.getElementById("current-url") as HTMLDivElement;
const foliumUrlInput = document.getElementById("folium-url") as HTMLInputElement;
const apiTokenInput = document.getElementById("api-token") as HTMLInputElement;
const visibilityInput = document.getElementById("visibility") as HTMLSelectElement;
const savePageButton = document.getElementById("save-page") as HTMLButtonElement;
const saveSelectionButton = document.getElementById("save-selection") as HTMLButtonElement;
const saveSettingsButton = document.getElementById("save-settings") as HTMLButtonElement;

function setStatus(message: string) {
  statusEl.textContent = message;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/g, "");
}

async function getConfig(): Promise<FoliumConfig> {
  return chrome.storage.local.get(["url", "token", "visibility"]) as Promise<FoliumConfig>;
}

async function setConfig(config: FoliumConfig) {
  await chrome.storage.local.set(config);
}

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) throw new Error("No active tab");
  return tab;
}

function readPage(): ClippedPage {
  const meta = (selector: string) => document.querySelector(selector)?.getAttribute("content")?.trim() ?? "";
  const absolute = (value: string | null | undefined) => {
    if (!value) return null;
    try { return new URL(value, location.href).toString(); } catch { return null; }
  };
  const canonical = (document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href || location.href;
  const favicon = (document.querySelector('link[rel="icon"]') as HTMLLinkElement | null)?.href || (document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement | null)?.href || "/favicon.ico";
  return {
    url: location.href,
    title: meta('meta[property="og:title"]') || meta('meta[name="twitter:title"]') || document.title,
    description: meta('meta[property="og:description"]') || meta('meta[name="description"]') || meta('meta[name="twitter:description"]'),
    canonicalUrl: canonical,
    contentText: document.body?.innerText ?? "",
    htmlContent: document.documentElement?.outerHTML ?? "",
    selectionText: window.getSelection()?.toString() ?? "",
    previewImage: absolute(meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]')),
    favicon: absolute(favicon),
  };
}

async function clip(useSelection: boolean) {
  const config = await getConfig();
  const baseUrl = normalizeBaseUrl(config.url ?? "");
  if (!baseUrl || !config.token) throw new Error("Configure Folium URL and API token first.");
  const tab = await getActiveTab();
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id! }, func: readPage });
  if (!result) throw new Error("Could not read current page.");
  const page = result as ClippedPage;
  const contentText = useSelection && page.selectionText.trim() ? page.selectionText : page.contentText;
  if (contentText.trim().length < 20) throw new Error("No readable text found on this page.");

  const response = await fetch(`${baseUrl}/api/clip`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify({
      url: page.url,
      title: page.title,
      description: page.description,
      canonicalUrl: page.canonicalUrl,
      contentText,
      htmlContent: useSelection ? "" : page.htmlContent,
      previewImage: page.previewImage,
      favicon: page.favicon,
      visibility: visibilityInput.value === "public" ? "public" : "private",
      source: "browser_extension",
    }),
  });
  const body = await response.json().catch(() => null) as { block?: { id?: string; title?: string }; error?: string; duplicate?: boolean } | null;
  if (!response.ok) throw new Error(body?.error ?? `Folium returned ${response.status}`);
  setStatus(`${body?.duplicate ? "Updated existing" : "Saved"}: ${body?.block?.title ?? body?.block?.id ?? "block"}`);
}

async function init() {
  const config = await getConfig();
  foliumUrlInput.value = config.url ?? "";
  apiTokenInput.value = config.token ?? "";
  visibilityInput.value = config.visibility ?? "private";
  const tab = await getActiveTab().catch(() => null);
  currentUrlEl.textContent = tab?.url ?? "";

  saveSettingsButton.addEventListener("click", async () => {
    await setConfig({ url: normalizeBaseUrl(foliumUrlInput.value), token: apiTokenInput.value.trim(), visibility: visibilityInput.value === "public" ? "public" : "private" });
    setStatus("Settings saved.");
  });
  visibilityInput.addEventListener("change", async () => {
    await setConfig({ visibility: visibilityInput.value === "public" ? "public" : "private" });
  });
  savePageButton.addEventListener("click", () => clip(false).catch((error) => setStatus(error instanceof Error ? error.message : String(error))));
  saveSelectionButton.addEventListener("click", () => clip(true).catch((error) => setStatus(error instanceof Error ? error.message : String(error))));
}

init().catch((error) => setStatus(error instanceof Error ? error.message : String(error)));
