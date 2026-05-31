import Link from "next/link";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";

const deployPrompt = `Please deploy Folium for me from https://github.com/musca1997/folium.

Use Docker Compose if available. Otherwise use npm with separate web and worker processes.
Deployment does not require a Folium API token.

After deployment, verify the web UI, tell me the URL, and remind me to change the initial password before generating an Agent API token.`;

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
                Browse through a visual grid, search, topics, nodes, and a graph without turning links into a raw bookmark dump.
              </p>
            </div>
          </div>
        </section>

        <section id="agents" className="mt-8 border border-line p-6 scroll-mt-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Agent-ready</p>
              <h2 className="mt-2 text-xl font-normal tracking-tight">Deploy it, then let agents use it</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                There are two separate agent workflows. Deployment does not need a Folium API token. Library operations do: after Folium is
                running, generate an Agent API token in Settings and give the agent only the Folium URL and token.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="border border-line p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Deploy</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Clone, configure, start web and worker services, verify the URL. No Folium API token needed.
                  </p>
                </div>
                <div className="border border-line p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">Use</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Save, search, extract, pin, and curate links through the CLI/API with an Agent API token.
                  </p>
                </div>
              </div>
            </div>
            <Link href="https://github.com/musca1997/folium" className="border border-line p-5 hover:bg-soft">
              <p className="text-xs uppercase tracking-wide text-muted">GitHub</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Read the source, deployment notes, roadmap, CLI docs, and self-hosting guidance for the public preview.
              </p>
            </Link>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Copyable deploy prompt</p>
              <pre className="mt-3 overflow-x-auto border border-line bg-soft p-4 text-xs leading-relaxed text-ink"><code>{deployPrompt}</code></pre>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">CLI after deployment</p>
              <pre className="mt-3 overflow-x-auto border border-line bg-soft p-4 text-xs leading-relaxed text-ink"><code>{`folium config set-url https://your-folium.example.com
folium config set-token folium_xxx
folium status --json
folium add https://example.com --private --wait --json
folium search "local-first knowledge tools" --json`}</code></pre>
            </div>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <p className="text-xs uppercase tracking-wide text-muted">Safety notes</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Change default credentials before remote access. Keep secrets out of chat logs and git. Save privately unless you explicitly want a
              block public. Use HTTPS or private network access for remote deployments. Back up local data before upgrades or agent maintenance.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
