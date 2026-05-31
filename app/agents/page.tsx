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

export default function AgentsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-5 py-6">
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
            <Link href="/about" className="border border-line px-3 py-2 text-muted hover:border-ink hover:text-ink">About Folium</Link>
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
      </main>
    </>
  );
}
