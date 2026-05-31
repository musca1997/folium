import Link from "next/link";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";

export default async function NodesPage() {
  const authed = await isAuthenticated();
  const nodes = authed ? await libraryStore.listNodes() : await libraryStore.listPublicNodes();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-5 py-6">
        <PageIntro
          eyebrow="LLM wiki"
          title="Nodes"
          description="The lightweight wiki graph growing behind the library, generated from the pages you save."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {nodes.map((node) => (
            <Link key={node.id} href={`/nodes/${node.slug}`} className="border border-line p-4 hover:bg-soft">
              <p className="text-sm">{node.name}</p>
              <p className="mt-1 text-xs text-muted">{node.type}</p>
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">{node.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
