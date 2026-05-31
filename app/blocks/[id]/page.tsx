import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { NodeChips } from "@/components/NodeChips";
import { AutoRefresh } from "@/components/AutoRefresh";
import { EvidenceList } from "@/components/EvidenceList";
import { ProcessingTimeline } from "@/components/ProcessingTimeline";
import { deleteBlockAction, recaptureBlockAction, reprocessBlockWithAiAction, retryBlockProcessingAction, updateBlockAction } from "@/app/actions";
import { getCsrfToken, isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";
import { getWorkerHeartbeat } from "@/lib/workerHeartbeat";

export default async function BlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authed = await isAuthenticated();
  const [block, nodes, topics, jobs, heartbeat] = await Promise.all([
    authed ? libraryStore.getBlock(id) : libraryStore.getPublicBlock(id),
    authed ? libraryStore.listNodes() : libraryStore.listPublicNodes(),
    authed ? libraryStore.listTopics() : libraryStore.listPublicTopics(),
    authed ? libraryStore.listJobs() : Promise.resolve([]),
    getWorkerHeartbeat(),
  ]);
  if (!block) notFound();
  const latestJob = jobs.filter((job) => job.blockId === block.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
  const csrf = authed ? await getCsrfToken() : "";

  return (
    <>
      <Header />
      <AutoRefresh active={block.status !== "indexed" && block.status !== "failed"} />
      <main className="mx-auto max-w-6xl px-5 py-6">
        <PageIntro eyebrow="Saved reference" title={block.title} description={block.summary || block.description || `A page saved from ${block.domain}.`} />
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
          <section>
            <div className="flex aspect-video items-center justify-center overflow-hidden border border-line bg-soft text-sm text-muted">
              {block.screenshotPath || block.previewImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={block.screenshotPath ?? block.previewImage ?? ""} alt="" className="h-full w-full object-cover grayscale" />
              ) : (
                "Screenshot placeholder"
              )}
            </div>
            <div className="mt-5 border border-line p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted">Source</p>
              <a className="break-all text-sm underline" href={block.url} target="_blank" rel="noreferrer">
                {block.url}
              </a>
            </div>
            {authed ? (
              <div className="mt-5 border border-line p-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-muted">Edit block</p>
                <form action={updateBlockAction} className="space-y-3">
                  <input type="hidden" name="csrf" value={csrf} />
                  <input type="hidden" name="id" value={block.id} />
                  <label className="block text-xs text-muted">
                    Title
                    <input name="title" defaultValue={block.title} className="mt-1 w-full border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-ink" />
                  </label>
                  <label className="block text-xs text-muted">
                    Summary
                    <textarea name="summary" defaultValue={block.summary} rows={4} className="mt-1 w-full resize-y border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-ink" />
                  </label>
                  <label className="block text-xs text-muted">
                    Description
                    <textarea name="description" defaultValue={block.description} rows={3} className="mt-1 w-full resize-y border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-ink" />
                  </label>
                  <fieldset className="border border-line p-3">
                    <legend className="px-1 text-xs uppercase tracking-wide text-muted">Visibility</legend>
                    <div className="flex gap-4 text-sm text-ink">
                      <label className="flex items-center gap-2"><input type="radio" name="visibility" value="private" defaultChecked={block.visibility !== "public"} /> Private</label>
                      <label className="flex items-center gap-2"><input type="radio" name="visibility" value="public" defaultChecked={block.visibility === "public"} /> Public</label>
                    </div>
                  </fieldset>
                  <button type="submit" className="border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-white">Save changes</button>
                </form>
                <div className="mt-4 border-t border-line pt-4">
                  <p className="mb-3 text-xs uppercase tracking-wide text-muted">Processing actions</p>
                  <div className="flex flex-wrap gap-2">
                    <form action={reprocessBlockWithAiAction}>
                      <input type="hidden" name="csrf" value={csrf} />
                      <input type="hidden" name="id" value={block.id} />
                      <button type="submit" className="border border-line px-3 py-1.5 text-sm text-muted hover:border-ink hover:text-ink">Reprocess with AI</button>
                    </form>
                    <form action={retryBlockProcessingAction}>
                      <input type="hidden" name="csrf" value={csrf} />
                      <input type="hidden" name="id" value={block.id} />
                      <button type="submit" className="border border-line px-3 py-1.5 text-sm text-muted hover:border-ink hover:text-ink">Retry full processing</button>
                    </form>
                    <form action={recaptureBlockAction}>
                      <input type="hidden" name="csrf" value={csrf} />
                      <input type="hidden" name="id" value={block.id} />
                      <button type="submit" className="border border-line px-3 py-1.5 text-sm text-muted hover:border-ink hover:text-ink">Recapture metadata</button>
                    </form>
                  </div>
                </div>
                <form action={deleteBlockAction} className="mt-4 border-t border-line pt-4">
                  <input type="hidden" name="csrf" value={csrf} />
                  <input type="hidden" name="id" value={block.id} />
                  <label className="mb-2 block text-xs text-muted">Type delete to confirm
                    <input name="confirm" className="mt-1 w-full border border-line px-2 py-1.5 text-sm text-ink" />
                  </label>
                  <button type="submit" className="text-sm text-muted underline hover:text-ink">Delete block</button>
                </form>
              </div>
            ) : null}
          </section>
          <aside className="space-y-5">
            <ProcessingTimeline block={block} job={latestJob} heartbeat={heartbeat} />
            <div className="border border-line p-4 text-sm">
              <p className="mb-3 text-xs uppercase tracking-wide text-muted">Details</p>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-muted">Domain</dt>
                  <dd className="mt-1 break-words">{block.domain}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Added</dt>
                  <dd className="mt-1">{new Date(block.createdAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Updated</dt>
                  <dd className="mt-1">{new Date(block.updatedAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Visibility</dt>
                  <dd className="mt-1">{block.visibility}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Status</dt>
                  <dd className="mt-1">{block.status}</dd>
                </div>
              </dl>
            </div>
            <div className="border border-line p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-muted">Connected nodes</p>
              <NodeChips block={block} nodes={nodes} />
            </div>
            <div className="border border-line p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-muted">Reference</p>
              <EvidenceList block={block} nodes={nodes} topics={topics} />
            </div>
            {block.status !== "indexed" && block.status !== "failed" ? (
              <div className="border border-line p-4 text-sm text-muted">
                {heartbeat?.online ? "The worker is online. This page refreshes while processing." : <>Worker offline. Start it with <code>npm run worker</code> or <code>npm run dev:all</code>.</>}
              </div>
            ) : null}
            <Link href="/" className="inline-block text-sm underline">
              Back to library
            </Link>
          </aside>
        </div>
      </main>
    </>
  );
}
