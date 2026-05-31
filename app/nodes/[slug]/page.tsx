import { notFound } from "next/navigation";
import { BlockGrid } from "@/components/BlockGrid";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";

export default async function NodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const authed = await isAuthenticated();
  const [node, blocks, nodes] = await Promise.all([
    authed ? libraryStore.getNode(slug) : libraryStore.getPublicNode(slug),
    authed ? libraryStore.getBlocksForNode(slug) : libraryStore.getPublicBlocksForNode(slug),
    authed ? libraryStore.listNodes() : libraryStore.listPublicNodes(),
  ]);
  if (!node) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-6">
        <PageIntro eyebrow={`${node.type} node`} title={node.name} description={node.description || "A generated wiki node connected to saved references."} />
        <h2 className="mb-4 text-sm font-normal uppercase tracking-wide text-muted">Related blocks</h2>
        <BlockGrid blocks={blocks} nodes={nodes} />
      </main>
    </>
  );
}
