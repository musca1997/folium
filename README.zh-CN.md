# Folium

[English](./README.md)

一个自托管的 LLM Wiki 与策展式链接库，用来收藏你想保留的网络内容。

Folium 会把保存的链接转化为结构化参考资料：抽取可读正文、捕获视觉预览、总结页面、生成宽泛主题与可复用的 Wiki 节点，并让你以视觉库、搜索索引、主题地图和图谱的方式浏览这些内容。

演示站点：https://folium.fyi/

> 状态：正在积极开发中。Folium 目前设计为自托管的单用户应用，尚未针对公开的多用户生产环境完成加固。

## 截图

### 视觉链接库

![Folium visual library](docs/screenshots/library.png)

### 带参考资料与生成 Wiki 节点的 Block 详情

![Folium block detail](docs/screenshots/block-detail.png)

### 主题浏览

![Folium topics](docs/screenshots/topics.png)

### 图谱视图

![Folium graph](docs/screenshots/graph.png)

### 搜索

![Folium search](docs/screenshots/search.png)

## 当前功能

### 链接保存与内容抽取

- 将 URL 保存到自托管的视觉链接库中。
- 新链接默认设为私有，也可以选择公开可见。
- 使用后台任务队列处理正文抽取、截图和 AI 分析。
- Block 页面显示处理时间线，包括排队、抓取、浏览器回退、截图、分析和已索引等状态。
- 智能抽取流程：
  - 优先直接 fetch 并使用 Mozilla Readability 抽取正文；
  - 对被拦截、内容过少或高度依赖 JavaScript 的页面，回退到 Playwright 浏览器抽取；
  - 通过 Playwright 捕获页面截图。
- 受保护的截图路由，避免私有截图作为静态公开文件被访问。

### LLM Wiki / 策展式分类

- 兼容 OpenAI 的结构化分析，用于生成摘要、主题、节点、论点和参考证据。
- 粗粒度分类模式，避免过细分类和一次性节点。
- 主题页面用于浏览宽泛的内容簇。
- 节点页面用于浏览可复用的概念、来源、项目、技术、人物、作品、问题和审美方向。
- 使用保守模式的 Wikidata 辅助规范命名，并支持本地回退。
- Block 详情页包含 Reference 面板，展示证据摘录与生成的 claims。

### 浏览与管理

- 极简 masonry 风格视觉库网格。
- 支持跨 blocks、摘要、抽取正文、主题和节点搜索。
- 交互式图谱视图，包含宽泛分类环、主题/内容深度控制、过滤、平移和缩放。
- Block 详情页包含来源、截图、摘要、元数据、关联节点、参考资料和编辑控件。
- 登录后可以编辑或删除 blocks。
- 登录后可以执行处理操作：重新完整处理、重新 AI 分析、重新捕获元数据。
- `/processing` 页面用于查看排队、运行中、完成和失败的任务。

### 自托管

- 单用户用户名/密码登录。
- 游客可以浏览公开内容；添加、编辑、删除、设置和处理页面需要登录。
- 可以在 UI 中编辑 AI provider 设置，并保存在本地。
- 当前原型使用 JSON 文件存储。
- `npm run dev:all` 和 `npm run start:all` 会同时运行 web 与 worker。
- Docker Compose 部署包含独立的 `web` 和 `worker` 服务。

## 正在开发 / 当前限制

- Folium 目前是单用户应用，还不是多用户团队产品。
- JSON 存储方便原型开发，但存在并发限制；后续计划迁移到 SQLite/Postgres。
- 分类质量依赖配置的 LLM，仍在持续调优。
- 即使有浏览器回退，部分网站仍可能阻止内容抽取或截图。
- 分类管理 UI 已有实验版本，但尚未暴露在主导航中。
- 已实现 public/private 过滤，但暴露到公网的部署仍应谨慎对待。
- 批量导入、导出流程和更丰富的文档抽取尚未实现。

## 本地开发

```bash
npm install
npm run dev:all
```

`dev:all` 会同时启动 Next.js 应用和后台 worker，因此排队的 blocks 会自动处理。如果你更喜欢分开终端运行，可以分别执行 `npm run dev` 和 `npm run worker`。

打开 `http://localhost:3000`。

常用页面：

- `/` — 视觉链接库
- `/add` — 保存 URL
- `/topics` — 生成的主题和 Wiki 节点
- `/search` — 关键词搜索
- `/graph` — block-node 图谱摘要
- `/processing` — 排队/运行中/完成/失败的任务

## 生产运行

```bash
npm install
npm run build
npm run start:all -- -H 0.0.0.0 -p 3000
```

如果使用 systemd 等进程管理器，请将 web 和 worker 作为两个长期运行的服务分别启动：`npm run start` 和 `npm run worker`。

## Docker Compose

先创建 `.env.local`。它可以为空，也可以包含你的 LLM 设置。

```bash
cp .env.example .env.local
docker compose up --build
```

Folium 会以两个服务运行在 `http://localhost:3000`：

- `web` — Next.js 应用
- `worker` — 后台队列处理器

持久化 volumes：

- `folium-data` — `data/library.json`
- `folium-screenshots` — `data/screenshots` 下生成的截图

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
npm run extension:build
```

## 环境变量

复制 `.env.example` 到 `.env.local`，并设置 `OPENAI_API_KEY` 以启用真实的 LLM 节点抽取。

```bash
cp .env.example .env.local
```

可以通过修改 `OPENAI_BASE_URL` 和 `OPENAI_MODEL` 使用任何兼容 OpenAI chat-completions 的 endpoint。在将 Folium 暴露到 localhost 以外之前，请修改 `FOLIUM_USERNAME`、`FOLIUM_PASSWORD` 和 `FOLIUM_SESSION_SECRET`。

如果 Playwright 本地没有安装浏览器，请运行：

```bash
npx playwright install chromium
```

## 安全说明

- Folium 会将本地链接库数据、认证凭据、AI provider 设置、Wikidata 缓存和截图存储在 `data/` 下。
- 不要提交 `.env.local` 或 `data/`。
- 新链接默认私有；游客只能浏览公开内容。
- 当前认证模型是单用户模式，面向自托管部署。
- 密码使用 Node `scrypt` 存储；旧的 SHA-256 hash 会在成功登录后自动升级。
- 登录尝试会在本地通过 `data/login-rate-limit.json` 限流。
- 表单变更使用 CSRF token，破坏性操作需要显式确认。
- URL ingestion 会阻止 localhost、私有、link-local 和 reserved IP 范围，以降低 SSRF 风险。
- 远程部署前，请修改默认用户名/密码并设置强 `FOLIUM_SESSION_SECRET`。
- 如果暴露到本机以外，请放在 HTTPS 后面运行。
- 升级前请使用 Settings → Backup / restore，或定期复制 `data/`。

## License

Folium 使用 Apache License, Version 2.0 授权。详情见 [LICENSE](./LICENSE)。

## Roadmap

已完成的基础能力：

- [x] 为 blocks、search 和 processing status 添加认证 HTTP API。
- [x] 在 `packages/cli` 下添加 repo 内置的 `folium` CLI，用于 agent-friendly 的 save/search/get 工作流。
- [x] 添加 `docs/cli.md`，提供面向用户的 CLI 设置和命令示例。
- [x] 添加 `skills/folium/SKILL.md`，提供面向 agent 的 save/search/get 使用说明。
- [x] 添加项目级 `AGENTS.md`，供参与 Folium 开发的 coding agents 阅读。
- [x] 添加 extract-without-saving API 和 CLI 命令。
- [x] 添加 CLI pin/unpin 和 public/private 策展命令。
- [x] 探索面向 Claude Code、Codex、OpenClaw、Pi 和其他 agent 工具的 MCP server 支持。

可靠性与部署：

- [x] 为 library/job 存储添加 atomic JSON writes 和 file locking。
- [x] 在可配置超时后重置 stale running jobs。
- [x] 为 processing jobs 添加 retry policy、max attempts 和 last-error history。
- [ ] 添加更丰富的 worker health checks 与 processing diagnostics。
- [ ] 为 web 和 worker 添加更适合生产环境的 Docker health checks。
- [ ] 添加 systemd units 示例。
- [ ] 添加 Caddy/nginx reverse-proxy 示例和单用户公网托管指南。
- [ ] 添加带 retention settings 的定时本地备份。

数据质量与策展：

- [x] 创建 blocks 前添加重复 URL 检测和 canonical URL 匹配。
- [x] 添加 URL canonicalization 规则，用于处理 tracking parameters、canonical links 和规范化 domains。
- [ ] 添加等价 blocks 的重复合并工具。
- [ ] 为每个 block 存储 fetch、browser fallback、screenshot 和 AI analysis 的 extraction events。
- [ ] 在登录态 block 页面展示 provider/model、retry history 和紧凑 processing logs。
- [ ] 完成分类管理 UI，包括 rename、aliases、merge、delete 和 canonical review flows。
- [ ] 分类建议影响全局图谱前，添加人工 review workflow。
- [ ] 添加可配置 AI style prompt、首选语言和分类粒度。

Agent API、CLI 与集成：

- [x] 添加支持 Chrome/Chromium 和 Firefox 的浏览器扩展 / web clipper，用于保存登录墙和浏览器验证页面。
- [ ] 为 API routes 和 CLI commands 添加自动化测试。
- [ ] 打包 Folium CLI，支持本地安装和 npm 发布。
- [x] 添加 named API tokens，包含 created-at、last-used-at 和 revoke 控制。
- [ ] 添加可选 API token scopes，如 read-only、write 和 admin actions。
- [ ] 为 token-authenticated requests 添加 API 限流。
- [ ] 添加带 curl 示例的 API reference 文档。
- [ ] 添加面向 Claude Code、Codex、OpenClaw、Pi 和 shell scripts 的 agent workflow 示例。
- [ ] 添加 MCP client configuration 示例文档。

浏览与链接库工作流：

- [ ] 添加 Library list view，作为视觉网格以外的高密度浏览方式。
- [ ] 为选中的 blocks 添加批量操作：pin、unpin、public、private、delete 和 reprocess。
- [ ] 添加一键保存用的浏览器 bookmarklet。
- [ ] 支持 Netscape bookmarks、JSON、Markdown、Linkding、Raindrop 和类似工具的导入/导出。
- [ ] 添加用于完整 library 迁移的 JSON export/import。
- [ ] 添加针对 selected blocks、topics 和 nodes 的 Markdown export。

搜索、图谱与存储：

- [ ] 从 JSON 存储迁移到 SQLite 或 Postgres。
- [ ] 添加全文搜索索引。
- [ ] 添加 embeddings 和语义搜索，可能使用 pgvector 或本地向量索引。
- [ ] 改进 nodes、topics 和 saved sources 之间的边抽取。
- [ ] 添加带有更清晰 provenance 和 confidence 的 evidence-backed claims。
- [ ] 添加图谱搜索、hover highlighting、选中节点 1-hop/2-hop 模式，以及隐藏低信号节点。

内容支持：

- [ ] PDF 抽取。
- [ ] 图片上传与 OCR。
- [ ] YouTube transcript 支持。
- [ ] 针对困难网站改进浏览器渲染抽取。
- [ ] 可选的 local-first readable HTML/text 归档。

更长期的产品方向：

- [ ] 为公开部署添加 read-only demo mode。
- [ ] 添加更强的生产环境安全指导。
- [ ] 单用户体验稳定后，考虑可选的多用户或团队模型。
