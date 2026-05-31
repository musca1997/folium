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

        <section className="grid gap-6 md:grid-cols-3">
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
        </section>

        <section className="mt-8 border border-line p-6">
          <h2 className="text-xl font-normal tracking-tight">Built for self-hosting</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            Folium is currently designed as a single-user self-hosted app. Public browsing can be enabled for public blocks, while adding,
            editing, processing, account settings, API tokens, and private content require login.
          </p>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
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
        </section>
      </main>
    </>
  );
}
