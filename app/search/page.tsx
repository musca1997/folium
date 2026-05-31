import Link from "next/link";
import { BlockGrid } from "@/components/BlockGrid";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const authed = await isAuthenticated();
  const [results, allNodes] = await Promise.all([
    authed ? libraryStore.search(q) : libraryStore.searchPublic(q),
    authed ? libraryStore.listNodes() : libraryStore.listPublicNodes(),
  ]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-6">
        <PageIntro
          eyebrow="Find"
          title="Search"
          description="Search saved pages, extracted text, AI summaries, source domains, and generated wiki nodes."
        />
        <section className="mb-8 max-w-3xl">
          <form className="flex gap-2" action="/search">
            <input name="q" defaultValue={q} placeholder="Search blocks, summaries, nodes..." className="min-w-0 flex-1 border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
            <button className="border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-white">Search</button>
          </form>
        </section>

        {q ? (
          <div className="mb-6 text-sm text-muted">
            {results.blocks.length} blocks · {results.nodes.length} nodes for “{q}”
          </div>
        ) : null}

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

        <BlockGrid blocks={results.blocks} nodes={allNodes} />
      </main>
    </>
  );
}
