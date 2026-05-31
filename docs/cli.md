# Folium CLI

Folium includes an early in-repo CLI for agent-friendly save, search, get, and status workflows.

The CLI talks to the Folium HTTP API using an API token. Generate a token from **Settings → Agent API**. Tokens are shown once; keep them private.

## Local development

From the Folium repository:

```bash
npm run cli -- config set-url https://folium.fyi
npm run cli -- config set-token folium_your_token
npm run cli -- status --json
```

You can also target a local server:

```bash
npm run cli -- config set-url http://127.0.0.1:3010
```

## Commands

### Show config

```bash
npm run cli -- config show --json
```

### Check status

```bash
npm run cli -- status --json
```

Returns worker heartbeat and job counts.

### Add a URL

```bash
npm run cli -- add https://example.com --private --json
```

New links default to private. Use `--public` only for links intended to be publicly visible.

Wait for processing:

```bash
npm run cli -- add https://example.com --private --wait --json
```

### Search

```bash
npm run cli -- search "vector search" --json
```

### Get a block

```bash
npm run cli -- get blk_xxx --json
npm run cli -- get blk_xxx --text
```

## Agent usage

Agents should prefer `--json` for stable parsing and should never print API tokens in conversation logs.

Recommended first workflow:

```bash
npm run cli -- search "topic or URL" --json
npm run cli -- add "https://example.com" --private --wait --json
```

## Current limitations

- This is an MVP CLI under `packages/cli`.
- Pin/public/private mutation commands are planned but not implemented yet.
- Extract-without-saving and MCP support are planned but not implemented yet.
