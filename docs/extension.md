# Folium Web Clipper

The Folium Web Clipper saves the current browser page, or selected text from the page, to a configured Folium instance.

It is useful for pages that Folium cannot fetch directly, including login-gated pages, Cloudflare/browser-verification pages, forums, and private documentation that you can already open in your own browser.

## Build

From the repository root:

```bash
npm run extension:build
```

The browser-specific unpacked extensions are written to:

```txt
packages/extension/dist-chrome
packages/extension/dist-firefox
```

## Load in Chrome or Chromium

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `packages/extension/dist-chrome`.

## Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `packages/extension/dist-firefox/manifest.json`.

Firefox temporary add-ons are removed when Firefox restarts. For long-term Firefox use, package and sign the extension through Mozilla Add-ons or use a Firefox build/profile that allows unsigned extensions.

## Configure

1. Open your Folium Settings page.
2. Generate an Agent API token.
3. Open the Folium extension popup.
4. Set:
   - Folium URL, for example `https://your-folium.example.com`
   - Agent API token, for example `folium_xxx`
5. Click **Save settings**.

## Save a page

Open a page in your browser, click the Folium extension, then choose:

- **Save page** — sends page title, URL, metadata, visible text, HTML, and a visible-tab screenshot.
- **Save selection** — sends selected text as the readable content, plus a visible-tab screenshot.

New clips default to private unless you choose public in the popup.

## How it works

The extension reads the current tab only when you click the extension action. It sends the clipped content to:

```txt
POST /api/clip
```

Folium then creates or updates the matching block, stores the provided browser content and screenshot, and queues AI analysis. The worker does not need to fetch the page again.

## Security notes

- The extension sends page text and a visible-tab screenshot from your current browser tab to your configured Folium instance.
- Keep the Agent API token private.
- Revoke the token in Folium Settings if it may have been exposed.
- Use private visibility unless you explicitly want the block to be guest-visible.
- Public blocks may expose URL, metadata, extracted text, summaries, topics, graph presence, and screenshots.
