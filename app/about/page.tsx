import Link from "next/link";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";

const deployPrompt = `Please deploy Folium for me from https://github.com/musca1997/folium.

Use Docker Compose if available. Otherwise use npm with separate web and worker processes.

Deployment does not require a Folium API token. After deployment:
1. Create a strong .env.local from .env.example.
2. Set a strong Folium username, password, and session secret.
3. Start both the web app and background worker.
4. Verify the web UI is reachable.
5. Tell me the local or public URL.
6. Remind me to change the initial password and generate an Agent API token only after login.`;

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-5 py-6">
        <PageIntro
          eyebrow="About"
          title="Folium is a quiet library for the web you keep."
          description="A self-hosted, LLM-assisted link curator that turns saved pages into structured references, reusable topics, and a small personal wiki."
        />

        <section className="grid gap-8 border border-line p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">What it is</p>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink">
              Folium is for links that deserve to be revisited: articles, tools, papers, projects, notes, and references that should not disappear
              into a bookmark folder.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
              It captures readable text and visual previews, then uses LLM assistance to connect pages through broad topics, reusable wiki nodes,
              references, and graph relationships. The goal is a curated library, not a noisy feed.
            </p>
          </div>
          <div className="border border-line p-5">
            <p className="text-xs uppercase tracking-wide text-muted">Built for self-hosting</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Folium is currently designed as a single-user self-hosted app. Public browsing can be enabled for public blocks, while adding,
              editing, processing, account settings, API tokens, and private content require login.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wide text-muted">How it works</p>
            <h2 className="mt-2 text-xl font-normal tracking-tight">Save, connect, revisit</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="border border-line p-5">
              <p className="text-xs uppercase tracking-wide text-muted">Save</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Save links with readable text extraction, visual previews, and private-by-default visibility.
              </p>
            </div>
            <div className="border border-line p-5">
              <p className="text-xs uppercase tracking-wide text-muted">Connect</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Let LLM analysis organize pages into broad topics, reusable wiki nodes, references, and graph connections.
              </p>
            </div>
            <div className="border border-line p-5">
              <p className="text-xs uppercase tracking-wide text-muted">Revisit</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Browse your library through a visual grid, search, topics, nodes, and a graph without turning it into a raw bookmark dump.
              </p>
            </div>
          </div>
        </section>

        <section id="agents" className="mt-12 scroll-mt-20 border-t border-line pt-8">
          <PageIntro
            eyebrow="Agent-friendly self-hosting"
            title="Use Folium with your agent."
            description="Coding agents can help deploy Folium, and once it is running, use the CLI/API to save, search, extract, and curate your library."
          />

          <section className="grid gap-6 md:grid-cols-3">
            <div className="border border-line p-5">
              <p className="text-xs uppercase tracking-wide text-muted">Extract</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Agents can save URLs, extract readable content, and keep the original link available as the source of truth.
              </p>
            </div>
            <div className="border border-line p-5">
              <p className="text-xs uppercase tracking-wide text-muted">Organize</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Folium can turn saved pages into summaries, broad topics, reusable wiki nodes, references, and graph connections.
              </p>
            </div>
            <div className="border border-line p-5">
              <p className="text-xs uppercase tracking-wide text-muted">Maintain</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Agents should help keep the library tidy over time, not make private content public or replace your judgment.
              </p>
            </div>
          </section>

          <section className="mt-8 border border-line p-6">
            <h2 className="text-xl font-normal tracking-tight">Two workflows, not one</h2>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <div className="border border-line p-5">
                <p className="text-xs uppercase tracking-wide text-muted">1. Deploy Folium</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Ask an agent to clone the repository, configure the environment, start web and worker services, and verify the deployment.
                  This stage does <span className="text-ink">not</span> require a Folium API token because the app is not running yet.
                </p>
              </div>
              <div className="border border-line p-5">
                <p className="text-xs uppercase tracking-wide text-muted">2. Use your library</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  After Folium is running, generate an Agent API token from Settings. Give the agent the Folium URL and token so it can use
                  the CLI/API to save, search, extract, pin, and curate links.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 border border-line p-6">
            <h2 className="text-xl font-normal tracking-tight">Prompt: ask your agent to deploy Folium</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
              Copy this into Claude Code, Codex, OpenClaw, Pi, or another coding agent with access to your server or development environment.
            </p>
            <pre className="mt-5 overflow-x-auto border border-line bg-soft p-4 text-xs leading-relaxed text-ink"><code>{deployPrompt}</code></pre>
          </section>

          <section className="mt-8 border border-line p-6">
            <h2 className="text-xl font-normal tracking-tight">After deployment: let your agent use Folium</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
              The Folium CLI is not required to deploy Folium. It is a remote control for an existing Folium instance. Generate an Agent API
              token from Settings, then configure the CLI locally.
            </p>
            <pre className="mt-5 overflow-x-auto border border-line bg-soft p-4 text-xs leading-relaxed text-ink"><code>{`folium config set-url https://your-folium.example.com
folium config set-token folium_xxx
folium status --json
folium add https://example.com --private --wait --json
folium search "local-first knowledge tools" --json
folium get blk_xxx --text
folium pin blk_xxx --json
folium private blk_xxx --json
folium extract https://example.com --json`}</code></pre>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <Link href="https://github.com/musca1997/folium" className="border border-line px-3 py-2 text-muted hover:border-ink hover:text-ink">GitHub</Link>
              <Link href="https://github.com/musca1997/folium/blob/master/docs/cli.md" className="border border-line px-3 py-2 text-muted hover:border-ink hover:text-ink">CLI docs</Link>
              <Link href="https://github.com/musca1997/folium/blob/master/skills/folium/SKILL.md" className="border border-line px-3 py-2 text-muted hover:border-ink hover:text-ink">Agent skill</Link>
            </div>
          </section>

          <section className="mt-8 border border-line p-6">
            <h2 className="text-xl font-normal tracking-tight">Safety notes for agents</h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
              <li>Change default credentials and use a strong session secret before remote access.</li>
              <li>Never paste passwords, API tokens, session secrets, or provider keys into public chat logs.</li>
              <li>Keep runtime files such as local environment files, data, screenshots, backups, and tokens out of git.</li>
              <li>New links should stay private unless you explicitly ask the agent to make them public.</li>
              <li>Public blocks can expose URLs, metadata, summaries, extracted text, topics, graph presence, and screenshots.</li>
              <li>Use HTTPS, a reverse proxy, VPN, Tailscale, SSH tunnel, or firewall allowlists for remote deployments.</li>
              <li>Back up local data before upgrades or agent maintenance.</li>
              <li>Ask agents to confirm destructive actions such as deleting blocks, changing visibility, rotating secrets, or changing server access.</li>
            </ul>
          </section>
        </section>
      </main>
    </>
  );
}
