# Folium

A self-hosted LLM Wiki and curated link library for the web you keep.

Folium turns saved links into structured references: it extracts readable text, captures visual previews, summarizes pages, creates broad topics and reusable wiki nodes, and lets you browse the result as a visual library, search index, topic map, and graph.

> Status: under active development. Folium is designed as a self-hosted single-user app and is not yet production-hardened for public multi-user deployments.

## Screenshots

### Visual library

![Folium visual library](docs/screenshots/library.png)

### Block detail with references and generated wiki nodes

![Folium block detail](docs/screenshots/block-detail.png)

### Topic browsing

![Folium topics](docs/screenshots/topics.png)

### Graph view

![Folium graph](docs/screenshots/graph.png)

### Search

![Folium search](docs/screenshots/search.png)

## Current features

### Link capture and extraction

- Save URLs into a self-hosted visual library.
- New links are private by default, with optional public visibility.
- Background job queue for extraction, screenshots, and AI analysis.
- Processing timeline on block pages showing queued, fetch, browser fallback, snapshot, analyze, and indexed states.
- Smart extraction pipeline:
  - direct fetch + Mozilla Readability first;
  - Playwright browser extraction fallback for blocked, thin, or JavaScript-heavy pages;
  - screenshot capture through Playwright.
- Protected screenshot route so private screenshots are not served as static public files.

### LLM Wiki / curated taxonomy

- OpenAI-compatible structured analysis for summaries, topics, nodes, claims, and reference evidence.
- Coarse taxonomy mode to avoid overly fine-grained categories and one-off nodes.
- Topic pages for browsing broad clusters.
- Node pages for reusable concepts, sources, projects, technologies, people, works, questions, and aesthetics.
- Wikidata-assisted canonical naming in conservative mode, with local fallback.
- Reference panel on block detail pages with evidence excerpts and claims.

### Browsing and management

- Minimal masonry-style visual library grid.
- Search across blocks, summaries, extracted text, topics, and nodes.
- Interactive graph view with broad category rings, topic/content depth controls, filtering, pan, and zoom.
- Block detail pages with source, screenshot, summary, metadata, connected nodes, references, and edit controls.
- Authenticated edit/delete for blocks.
- Authenticated processing actions: retry full processing, reprocess with AI, and recapture metadata.
- `/processing` page for queued/running/done/failed jobs.

### Self-hosting

- Single-user username/password auth.
- Public browsing for public content; add/edit/delete/settings/processing require login.
- AI provider settings editable from the UI and stored locally.
- JSON-file storage for the current prototype.
- `npm run dev:all` and `npm run start:all` run web + worker together.
- Docker Compose deployment with separate `web` and `worker` services.

## Under development / current limitations

- Folium is single-user today; it is not a multi-user team product yet.
- JSON storage is convenient for the prototype but can have concurrency limits; SQLite/Postgres is planned.
- Taxonomy quality depends on the configured LLM and is still being tuned.
- Some websites block extraction or screenshots despite browser fallback.
- The taxonomy management UI exists experimentally but is not exposed in the main navigation yet.
- Public/private filtering is implemented, but deployments exposed to the public internet should still be treated cautiously.
- Browser extension, bulk imports, export flows, and richer document extraction are not implemented yet.

## Local development

```bash
npm install
npm run dev:all
```

`dev:all` starts both the Next.js app and the background worker so queued blocks are processed automatically. If you prefer separate terminals, run `npm run dev` and `npm run worker` separately.

Open `http://localhost:3000`.

Useful pages:

- `/` — visual library
- `/add` — save a URL
- `/search` — keyword search
- `/nodes` — generated wiki nodes
- `/graph` — block-node graph summary
- `/processing` — queued/running/done/failed jobs

## Production

```bash
npm install
npm run build
npm run start:all -- -H 0.0.0.0 -p 3000
```

For process managers such as systemd, run web and worker as two long-lived services: `npm run start` and `npm run worker`.

## Docker Compose

Create `.env.local` first. It can be empty, or contain your LLM settings.

```bash
cp .env.example .env.local
docker compose up --build
```

Folium will run at `http://localhost:3000` with two services:

- `web` — Next.js app
- `worker` — background queue processor

Persistent volumes:

- `folium-data` — `data/library.json`
- `folium-screenshots` — generated screenshots under `data/screenshots`

## Scripts

```bash
npm test
npm run typecheck
npm run build
npm run start
npm run dev:all
npm run start:all
npm run worker
npm run worker:once
```

## Environment

Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY` to enable real LLM node extraction.

```bash
cp .env.example .env.local
```

Any OpenAI-compatible chat-completions endpoint can be used by changing `OPENAI_BASE_URL` and `OPENAI_MODEL`. Change `FOLIUM_USERNAME`, `FOLIUM_PASSWORD`, and `FOLIUM_SESSION_SECRET` before exposing Folium beyond localhost.

If Playwright has no local browser installed, run:

```bash
npx playwright install chromium
```

## Security notes

- Folium stores local library data, auth credentials, AI provider settings, Wikidata cache, and screenshots under `data/`.
- Do not commit `.env.local` or `data/`.
- New links are private by default; guests can only browse public content.
- The current auth model is single-user and intended for self-hosted deployments.
- Change the default username/password and set a strong `FOLIUM_SESSION_SECRET` before remote deployment.
- Run behind HTTPS if exposed outside your machine.

## License

Folium is licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE).

## Roadmap

Near-term:

- Worker heartbeat and clearer online/offline status in the UI.
- More transparent extraction logs and retry diagnostics per block.
- Finish taxonomy management UI for rename, aliases, merge, delete, and canonical review flows.
- Browser bookmarklet / extension for one-click saving.
- Import/export for Netscape bookmarks, JSON, Markdown, Linkding, Raindrop, and similar tools.
- Configurable AI style prompt, preferred language, and taxonomy granularity.

Storage and search:

- Move from JSON storage to SQLite or Postgres.
- Add full-text search indexes.
- Add embeddings and semantic search, likely with pgvector or a local vector index.
- Add safer queue locking and stuck-job recovery.

Knowledge graph and curation:

- Better edge extraction between nodes, topics, and saved sources.
- Evidence-backed claims with clearer provenance and confidence.
- Graph search, hover highlighting, selected-node 1-hop/2-hop mode, and low-signal node hiding.
- Manual review workflow for taxonomy suggestions before they affect the global graph.

Content support:

- PDF extraction.
- Image upload and OCR.
- YouTube transcript support.
- Browser-rendered extraction improvements for difficult sites.
- Optional local-first archiving of readable HTML/text.

Deployment and product hardening:

- Better Docker health checks.
- Example systemd units.
- Stronger production security guidance.
- Optional multi-user or team model after the single-user experience is stable.
