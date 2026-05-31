import Link from "next/link";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";

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

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wide text-muted">For builders and agents</p>
            <h2 className="mt-2 text-xl font-normal tracking-tight">Deploy it, inspect it, extend it</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Link href="/agents" className="border border-line p-5 hover:bg-soft">
              <p className="text-xs uppercase tracking-wide text-muted">Agents</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Let coding agents deploy Folium for you, then use the CLI/API to save, search, extract, and curate your library.
              </p>
            </Link>
            <Link href="https://github.com/musca1997/folium" className="border border-line p-5 hover:bg-soft">
              <p className="text-xs uppercase tracking-wide text-muted">GitHub</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Read the source, deployment notes, roadmap, CLI docs, and self-hosting guidance for the public preview.
              </p>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
