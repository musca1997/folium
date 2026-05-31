import Link from "next/link";
import { BlockGrid } from "@/components/BlockGrid";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";

export default async function NodesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const authed = await isAuthenticated();
  const [nodes, searchResults] = await Promise.all([
    authed ? libraryStore.listNodes() : libraryStore.listPublicNodes(),
    query ? (authed ? libraryStore.search(query) : libraryStore.searchPublic(query)) : Promise.resolve(null),
  ]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-6">
        <PageIntro
          eyebrow="LLM wiki"
          title="Nodes"
          description="Search and browse the lightweight wiki graph growing behind the library."
        />
        <section className="mb-8 max-w-3xl">
          <form className="flex gap-2" action="/nodes">
            <input name="q" defaultValue={query} placeholder="Search pages, summaries, topics, nodes..." className="min-w-0 flex-1 border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
            <button className="border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-white">Search</button>
            {query ? <Link href="/nodes" className="border border-line px-4 py-2 text-sm text-muted hover:border-ink hover:text-ink">Clear</Link> : null}
          </form>
        </section>

        {searchResults ? (
          <>
            <div className="mb-6 text-sm text-muted">
              {searchResults.blocks.length} blocks · {searchResults.nodes.length} nodes for “{query}”
            </div>

            {searchResults.nodes.length > 0 ? (
              <section className="mb-8">
                <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">Matching nodes</h2>
                <div className="flex flex-wrap gap-2">
                  {searchResults.nodes.map((node) => (
                    <Link key={node.id} href={`/nodes/${node.slug}`} className="border border-line px-3 py-1 text-sm hover:border-ink">
                      {node.name}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">Matching blocks</h2>
              <BlockGrid blocks={searchResults.blocks} nodes={nodes} />
            </section>
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nodes.map((node) => (
              <Link key={node.id} href={`/nodes/${node.slug}`} className="border border-line p-4 hover:bg-soft">
                <p className="text-sm">{node.name}</p>
                <p className="mt-1 text-xs text-muted">{node.type}</p>
                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">{node.description}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
