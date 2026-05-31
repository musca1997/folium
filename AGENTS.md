# Folium Agent Notes

Folium is a self-hosted LLM-assisted link library and personal web wiki.

## Development checks

Before claiming work is complete, run:

```bash
npm run typecheck
npm test
npm run build
```

If CLI code changes, also run:

```bash
npm run cli:build
```

## Project rules

- Do not commit `.env.local`, runtime `data/*.json`, `data/screenshots`, or local backups.
- Do not print API keys, API tokens, passwords, or session secrets.
- New links default to private.
- Public/private filtering must apply to blocks, screenshots, search, topics, nodes, graph, and API output where relevant.
- Keep UI copy user-facing; avoid exposing env var names, file paths, or shell commands in normal UI.
- Prefer quiet, minimal UI: white background, thin borders, restrained typography.
- The app is single-user/self-hosted today, not a public multi-user product.

## CLI / Agent API direction

- In-repo CLI lives under `packages/cli`.
- Human-facing CLI docs live at `docs/cli.md`.
- Agent-facing Folium skill lives at `skills/folium/SKILL.md`.
- Agent/CLI workflows should prefer JSON output.
