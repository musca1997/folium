import Link from "next/link";
import { BlockGrid } from "@/components/BlockGrid";
import { Header } from "@/components/Header";
import { NodeSearchForm } from "@/components/NodeSearchForm";
import { PageIntro } from "@/components/PageIntro";
import { isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const authed = await isAuthenticated();
  const [nodes, results] = await Promise.all([
    authed ? libraryStore.listNodes() : libraryStore.listPublicNodes(),
    query ? (authed ? libraryStore.search(query) : libraryStore.searchPublic(query)) : Promise.resolve(null),
  ]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-6">
        <PageIntro
          eyebrow="Find"
          title="Search"
          description="Search saved pages, summaries, extracted text, topics, and wiki nodes."
        />
        <section className="mb-8 max-w-3xl">
          <NodeSearchForm initialQuery={query} action="/search" clearHref="/search" />
        </section>

        {!query ? (
          <div className="border border-line p-6 text-sm leading-relaxed text-muted">
            Search across your library, or browse the generated topic and node layer from <Link href="/topics" className="underline">Topics</Link>.
          </div>
        ) : results ? (
          <>
            <div className="mb-6 text-sm text-muted">
              {results.blocks.length} blocks · {results.nodes.length} nodes for “{query}”
            </div>
            {results.nodes.length > 0 ? (
              <section className="mb-8">
                <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">Matching nodes</h2>
                <div className="flex flex-wrap gap-2">
                  {results.nodes.map((node) => (
                    <Link key={node.id} href={`/nodes/${node.slug}`} className="border border-line px-3 py-1 text-sm hover:border-ink">
                      {node.name}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
            <section>
              <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">Matching blocks</h2>
              <BlockGrid blocks={results.blocks} nodes={nodes} />
            </section>
          </>
        ) : null}
      </main>
    </>
  );
}
