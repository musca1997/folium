import { describe, expect, it } from "vitest";
import { extractPageDataFromHtml } from "@/lib/ingest/extract";

const html = `<!doctype html>
<html>
  <head>
    <title>Fallback title</title>
    <link rel="icon" href="/favicon.ico" />
    <meta property="og:title" content="Open Graph Title" />
    <meta name="description" content="Plain description" />
    <meta property="og:description" content="OG description" />
    <meta property="og:image" content="/preview.jpg" />
    <link rel="canonical" href="https://example.com/canonical" />
  </head>
  <body>
    <article>
      <h1>Readable heading</h1>
      <p>This is a readable paragraph with enough words for extraction.</p>
      <p>Another paragraph about personal knowledge management and visual libraries.</p>
    </article>
  </body>
</html>`;

describe("extractPageDataFromHtml", () => {
  it("extracts metadata and resolves relative assets", () => {
    const data = extractPageDataFromHtml(html, "https://example.com/posts/a");

    expect(data.title).toBe("Open Graph Title");
    expect(data.description).toBe("OG description");
    expect(data.previewImage).toBe("https://example.com/preview.jpg");
    expect(data.favicon).toBe("https://example.com/favicon.ico");
    expect(data.canonicalUrl).toBe("https://example.com/canonical");
  });

  it("extracts readable text from article content", () => {
    const data = extractPageDataFromHtml(html, "https://example.com/posts/a");

    expect(data.textContent).toContain("Readable heading");
    expect(data.textContent).toContain("visual libraries");
  });
});
