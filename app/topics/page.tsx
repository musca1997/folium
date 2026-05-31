import Link from "next/link";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";

export default async function TopicsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "topics" } = await searchParams;
  const activeView = view === "nodes" ? "nodes" : "topics";
  const authed = await isAuthenticated();
  const [topics, nodes] = await Promise.all([
    authed ? libraryStore.listTopics() : libraryStore.listPublicTopics(),
    authed ? libraryStore.listNodes() : libraryStore.listPublicNodes(),
  ]);
  const topicsWithCounts = await Promise.all(
    topics.map(async (topic) => ({
      topic,
      blockCount: (await (authed ? libraryStore.getBlocksForTopic(topic.slug) : libraryStore.getPublicBlocksForTopic(topic.slug))).length,
    })),
  );

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-6">
        <PageIntro
          eyebrow="Browse the index"
          title="Topics"
          description="Browse the generated classification layer: broad topics for clusters, or reusable wiki nodes for concepts and sources."
        />
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="h-fit border border-line p-3 text-sm">
            <p className="mb-3 px-2 text-xs uppercase tracking-wide text-muted">View</p>
            <nav className="space-y-1">
              <Link href="/topics" className={`block border px-3 py-2 ${activeView === "topics" ? "border-ink text-ink" : "border-transparent text-muted hover:border-line hover:text-ink"}`}>
                Topics
                <span className="ml-2 text-xs text-muted">{topics.length}</span>
              </Link>
              <Link href="/topics?view=nodes" className={`block border px-3 py-2 ${activeView === "nodes" ? "border-ink text-ink" : "border-transparent text-muted hover:border-line hover:text-ink"}`}>
                Nodes
                <span className="ml-2 text-xs text-muted">{nodes.length}</span>
              </Link>
            </nav>
          </aside>

          <section>
            {activeView === "topics" ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {topicsWithCounts.map(({ topic, blockCount }) => (
                  <Link key={topic.id} href={`/topics/${topic.slug}`} className="border border-line p-4 hover:bg-soft">
                    <p className="text-sm">{topic.name}</p>
                    <p className="mt-1 text-xs text-muted">{blockCount} {blockCount === 1 ? "block" : "blocks"}</p>
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">{topic.description}</p>
                  </Link>
                ))}
              </div>
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
          </section>
        </div>
      </main>
    </>
  );
}
