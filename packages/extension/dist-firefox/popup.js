"use strict";
const detectedApi = window.browser ?? window.chrome;
if (!detectedApi)
    throw new Error("Extension API is not available.");
const extensionApi = detectedApi;
function promisify(call) {
    return new Promise((resolve, reject) => {
        try {
            const maybePromise = call((value) => {
                const error = extensionApi.runtime?.lastError?.message;
                if (error)
                    reject(new Error(error));
                else
                    resolve(value);
            });
            if (maybePromise && typeof maybePromise.then === "function")
                maybePromise.then(resolve, reject);
        }
        catch (error) {
            reject(error);
        }
    });
}
const statusEl = document.getElementById("status");
const currentUrlEl = document.getElementById("current-url");
const foliumUrlInput = document.getElementById("folium-url");
const apiTokenInput = document.getElementById("api-token");
const visibilityInput = document.getElementById("visibility");
const savePageButton = document.getElementById("save-page");
const saveSelectionButton = document.getElementById("save-selection");
const saveSettingsButton = document.getElementById("save-settings");
function setStatus(message) {
    statusEl.textContent = message;
}
function normalizeBaseUrl(value) {
    return value.trim().replace(/\/+$/g, "");
}
async function getConfig() {
    return promisify((callback) => extensionApi.storage.local.get(["url", "token", "visibility"], callback));
}
async function setConfig(config) {
    await promisify((callback) => extensionApi.storage.local.set(config, callback));
}
async function getActiveTab() {
    const [tab] = await promisify((callback) => extensionApi.tabs.query({ active: true, currentWindow: true }, callback));
    if (!tab?.id || !tab.url)
        throw new Error("No active tab");
    return tab;
}
function readPage() {
    const meta = (selector) => document.querySelector(selector)?.getAttribute("content")?.trim() ?? "";
    const absolute = (value) => {
        if (!value)
            return null;
        try {
            return new URL(value, location.href).toString();
        }
        catch {
            return null;
        }
    };
    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
    const favicon = document.querySelector('link[rel="icon"]')?.href || document.querySelector('link[rel="shortcut icon"]')?.href || "/favicon.ico";
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
async function captureVisibleScreenshot() {
    return promisify((callback) => extensionApi.tabs.captureVisibleTab(null, { format: "jpeg", quality: 72 }, callback)).catch(() => "");
}
async function clip(useSelection) {
    const config = await getConfig();
    const baseUrl = normalizeBaseUrl(config.url ?? "");
    if (!baseUrl || !config.token)
        throw new Error("Configure Folium URL and API token first.");
    const tab = await getActiveTab();
    const [{ result }] = await promisify((callback) => extensionApi.scripting.executeScript({ target: { tabId: tab.id }, func: readPage }, callback));
    if (!result)
        throw new Error("Could not read current page.");
    const page = result;
    const contentText = useSelection && page.selectionText.trim() ? page.selectionText : page.contentText;
    if (contentText.trim().length < 20)
        throw new Error("No readable text found on this page.");
    const screenshotDataUrl = await captureVisibleScreenshot();
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
            screenshotDataUrl,
            visibility: visibilityInput.value === "public" ? "public" : "private",
            source: "browser_extension",
        }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok)
        throw new Error(body?.error ?? `Folium returned ${response.status}`);
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
