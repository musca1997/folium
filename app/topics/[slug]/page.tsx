import Link from "next/link";
import { notFound } from "next/navigation";
import { BlockGrid } from "@/components/BlockGrid";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const authed = await isAuthenticated();
  const [topic, blocks, nodes, topicNodes] = await Promise.all([
    authed ? libraryStore.getTopic(slug) : libraryStore.getPublicTopic(slug),
    authed ? libraryStore.getBlocksForTopic(slug) : libraryStore.getPublicBlocksForTopic(slug),
    authed ? libraryStore.listNodes() : libraryStore.listPublicNodes(),
    authed ? libraryStore.getNodesForTopic(slug) : libraryStore.getPublicNodesForTopic(slug),
  ]);
  if (!topic) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-6">
        <PageIntro eyebrow="Fine topic" title={topic.name} description={topic.description || "A generated topic connected to saved references."} />

        {topicNodes.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">Related nodes</h2>
            <div className="flex flex-wrap gap-2">
              {topicNodes.map((node) => (
                <Link key={node.id} href={`/nodes/${node.slug}`} className="border border-line px-3 py-1 text-sm hover:border-ink">
                  {node.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <h2 className="mb-4 text-sm font-normal uppercase tracking-wide text-muted">Related blocks</h2>
        <BlockGrid blocks={blocks} nodes={nodes} />
      </main>
    </>
  );
}
