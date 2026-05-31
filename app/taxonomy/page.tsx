import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { deleteNodeAction, deleteTopicAction, mergeNodeAction, mergeTopicAction, updateNodeAction, updateTopicAction } from "@/app/actions";
import { isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";
import type { NodeType } from "@/lib/store/types";

const nodeTypes: NodeType[] = ["Concept", "Project", "Source", "Technology", "Person", "Work", "Question", "Aesthetic"];

export default async function TaxonomyPage() {
  if (!(await isAuthenticated())) redirect("/login?next=/taxonomy");
  const [topics, nodes] = await Promise.all([libraryStore.listTopics(), libraryStore.listNodes()]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-6">
        <PageIntro eyebrow="Admin" title="Taxonomy" description="Rename, alias, merge, or delete the generated topics and nodes that shape the wiki." />

        <section className="mb-10">
          <h2 className="mb-4 text-sm uppercase tracking-wide text-muted">Topics</h2>
          <div className="space-y-4">
            {topics.map((topic) => (
              <div key={topic.id} className="border border-line p-4">
                <form action={updateTopicAction} className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_220px_auto]">
                  <input type="hidden" name="id" value={topic.id} />
                  <label className="text-xs text-muted">Name<input name="name" defaultValue={topic.name} className="mt-1 w-full border border-line px-2 py-1.5 text-sm text-ink" /></label>
                  <label className="text-xs text-muted">Description<input name="description" defaultValue={topic.description} className="mt-1 w-full border border-line px-2 py-1.5 text-sm text-ink" /></label>
                  <label className="text-xs text-muted">Aliases<textarea name="aliases" defaultValue={(topic.aliases ?? []).join("\n")} rows={2} className="mt-1 w-full border border-line px-2 py-1.5 text-sm text-ink" /></label>
                  <button className="self-end border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-white">Save</button>
                </form>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  <form action={mergeTopicAction} className="flex gap-2 text-sm">
                    <input type="hidden" name="sourceId" value={topic.id} />
                    <select name="targetId" className="border border-line px-2 py-1.5">
                      {topics.filter((item) => item.id !== topic.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <button className="border border-line px-3 py-1.5 text-muted hover:border-ink hover:text-ink">Merge into</button>
                  </form>
                  <form action={deleteTopicAction}>
                    <input type="hidden" name="id" value={topic.id} />
                    <button className="px-3 py-1.5 text-sm text-muted underline hover:text-ink">Delete</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm uppercase tracking-wide text-muted">Nodes</h2>
          <div className="space-y-4">
            {nodes.map((node) => (
              <div key={node.id} className="border border-line p-4">
                <form action={updateNodeAction} className="grid gap-3 lg:grid-cols-[180px_140px_minmax(0,1fr)_220px_auto]">
                  <input type="hidden" name="id" value={node.id} />
                  <label className="text-xs text-muted">Name<input name="name" defaultValue={node.name} className="mt-1 w-full border border-line px-2 py-1.5 text-sm text-ink" /></label>
                  <label className="text-xs text-muted">Type<select name="type" defaultValue={node.type} className="mt-1 w-full border border-line px-2 py-1.5 text-sm text-ink">{nodeTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                  <label className="text-xs text-muted">Description<input name="description" defaultValue={node.description} className="mt-1 w-full border border-line px-2 py-1.5 text-sm text-ink" /></label>
                  <label className="text-xs text-muted">Aliases<textarea name="aliases" defaultValue={(node.aliases ?? []).join("\n")} rows={2} className="mt-1 w-full border border-line px-2 py-1.5 text-sm text-ink" /></label>
                  <button className="self-end border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-white">Save</button>
                </form>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  <form action={mergeNodeAction} className="flex gap-2 text-sm">
                    <input type="hidden" name="sourceId" value={node.id} />
                    <select name="targetId" className="border border-line px-2 py-1.5">
                      {nodes.filter((item) => item.id !== node.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <button className="border border-line px-3 py-1.5 text-muted hover:border-ink hover:text-ink">Merge into</button>
                  </form>
                  <form action={deleteNodeAction}>
                    <input type="hidden" name="id" value={node.id} />
                    <button className="px-3 py-1.5 text-sm text-muted underline hover:text-ink">Delete</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
