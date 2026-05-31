---
name: folium
description: Use Folium CLI to save, search, retrieve, and inspect links in the user's self-hosted Folium library. Use when the user asks to remember URLs, search saved web knowledge, retrieve saved references, or check Folium processing status.
---

# Folium Skill

Folium is a self-hosted LLM-assisted link library and personal web wiki. The CLI lets agents save links, search the library, retrieve block details, and inspect processing status.

## When to use

Use this skill when the user asks to:

- save, bookmark, archive, remember, or collect a URL;
- check whether a URL or topic already exists in their saved library;
- search previous saved references;
- retrieve a saved block's summary, extracted text, topics, nodes, or source URL;
- inspect processing status after saving a link.

Do not save content automatically unless the user asked to save, remember, archive, or collect it.

## Configuration

Check configuration first:

```bash
folium config show --json
```

If missing, ask the user for their Folium base URL and API token, then run:

```bash
folium config set-url "https://folium.fyi"
folium config set-token "<token>"
```

Never print API tokens in chat logs.

## Agent rules

- Prefer `--json` for all commands.
- New saved links should default to private unless the user explicitly asks for public.
- Do not make private content public unless the user explicitly asks.
- Before saving, search first if avoiding duplicates matters.
- If `add --wait` times out, report that the block was queued and include its ID.
- If the worker is offline, saving may still queue the link, but extraction will not finish until the worker is running.

## Commands

```bash
folium status --json
folium search "query" --json
folium add "https://example.com" --private --wait --json
folium get "blk_xxx" --json
folium get "blk_xxx" --text
```

## Error handling

- `401` or `403`: API token may be missing, invalid, or revoked.
- Server unreachable: ask the user to check their Folium URL or service.
- Unsafe URL: Folium blocks localhost/private network URLs for SSRF protection.
