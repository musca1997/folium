import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { NodeChips } from "@/components/NodeChips";
import { AutoRefresh } from "@/components/AutoRefresh";
import { EvidenceList } from "@/components/EvidenceList";
import { ProcessingTimeline } from "@/components/ProcessingTimeline";
import { SummaryToggle } from "@/components/SummaryToggle";
import { addBlockNodeLinkAction, addBlockTopicLinkAction, addOrCreateBlockNodeLinkAction, deleteBlockAction, recaptureBlockAction, removeBlockNodeLinkAction, removeBlockTopicLinkAction, reprocessBlockWithAiAction, retryBlockProcessingAction, setManualContentAction, submitBlockToWaybackAction, toggleBlockPinAction, updateBlockAction } from "@/app/actions";
import { getCsrfToken, isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";
import { getSettings } from "@/lib/settings";
import { getWorkerHeartbeat } from "@/lib/workerHeartbeat";

type WaybackView = {
  status: string;
  url?: string;
  timestamp?: string;
  checkedAt?: string;
  submittedAt?: string;
  error?: string;
};

function getWaybackView(metadata: Record<string, unknown>): WaybackView {
  const value = metadata.wayback;
  if (!value || typeof value !== "object") return { status: "unchecked" };
  const wayback = value as Record<string, unknown>;
  return {
    status: typeof wayback.status === "string" ? wayback.status : "unchecked",
    url: typeof wayback.url === "string" ? wayback.url : undefined,
    timestamp: typeof wayback.timestamp === "string" ? wayback.timestamp : undefined,
    checkedAt: typeof wayback.checkedAt === "string" ? wayback.checkedAt : undefined,
    submittedAt: typeof wayback.submittedAt === "string" ? wayback.submittedAt : undefined,
    error: typeof wayback.error === "string" ? wayback.error : undefined,
  };
}

export default async function BlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authed = await isAuthenticated();
  const [block, nodes, topics, jobs, heartbeat, settings] = await Promise.all([
    authed ? libraryStore.getBlock(id) : libraryStore.getPublicBlock(id),
    authed ? libraryStore.listNodes() : libraryStore.listPublicNodes(),
    authed ? libraryStore.listTopics() : libraryStore.listPublicTopics(),
    authed ? libraryStore.listJobs() : Promise.resolve([]),
    getWorkerHeartbeat(),
    getSettings(),
  ]);
  if (!block) notFound();
  const latestJob = jobs.filter((job) => job.blockId === block.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
  const csrf = authed ? await getCsrfToken() : "";
  const blockedReason = typeof block.metadata?.extractionBlockedReason === "string" ? block.metadata.extractionBlockedReason : null;
  const linkedTopicIds = new Set(block.topicLinks.map((link) => link.topicId));
  const linkedNodeIds = new Set(block.nodeLinks.map((link) => link.nodeId));
  const linkedTopics = block.topicLinks.map((link) => ({ link, topic: topics.find((topic) => topic.id === link.topicId) })).filter((item): item is { link: typeof block.topicLinks[number]; topic: (typeof topics)[number] } => Boolean(item.topic));
  const linkedNodes = block.nodeLinks.map((link) => ({ link, node: nodes.find((node) => node.id === link.nodeId) })).filter((item): item is { link: typeof block.nodeLinks[number]; node: (typeof nodes)[number] } => Boolean(item.node));
  const addableTopics = topics.filter((topic) => !linkedTopicIds.has(topic.id));
  const addableNodes = nodes.filter((node) => !linkedNodeIds.has(node.id));
  const wayback = getWaybackView(block.metadata);

  return (
    <>
      <Header />
      <AutoRefresh active={block.status !== "indexed" && block.status !== "failed"} />
      <main className="mx-auto max-w-6xl px-5 py-6">
        <PageIntro eyebrow="Saved reference" title={block.title} description={undefined} />
        <SummaryToggle summary={block.summary} summaryZh={block.summaryTranslations?.zh} fallback={block.description || `A page saved from ${block.domain}.`} multilingualEnabled={settings.summaryLanguages.enabled} preferredLanguage={settings.summaryLanguages.preferred} />
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
          <section>
            <div className="flex aspect-video items-center justify-center overflow-hidden border border-line bg-soft text-sm text-muted">
              {block.screenshotPath || block.previewImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={block.screenshotPath ?? block.previewImage ?? ""} alt="" loading="eager" decoding="async" className="h-full w-full object-cover grayscale" />
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
            {authed && blockedReason ? (
              <div className="mt-5 border border-line p-4">
                <p className="text-xs uppercase tracking-wide text-muted">Manual content</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Folium could not read this page because it appears to require browser verification or login. Open the source page, copy the useful text, and paste it here to continue AI analysis.
                </p>
                <form action={setManualContentAction} className="mt-4 space-y-3">
                  <input type="hidden" name="csrf" value={csrf} />
                  <input type="hidden" name="id" value={block.id} />
                  <label className="block text-xs text-muted">
                    Title
                    <input name="manualTitle" defaultValue={block.title} className="mt-1 w-full border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-ink" />
                  </label>
                  <label className="block text-xs text-muted">
                    Readable text
                    <textarea name="manualContent" rows={8} placeholder="Paste the readable page text here..." className="mt-1 w-full resize-y border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-ink" />
                  </label>
                  <button type="submit" className="border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-white">Use pasted text</button>
                </form>
              </div>
            ) : null}
            {authed ? (
              <div className="mt-5 border border-line p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-wide text-muted">Edit block</p>
                  <form action={toggleBlockPinAction}>
                    <input type="hidden" name="csrf" value={csrf} />
                    <input type="hidden" name="id" value={block.id} />
                    <input type="hidden" name="pinned" value={block.curation?.favorite ? "false" : "true"} />
                    <input type="hidden" name="next" value={`/blocks/${block.id}`} />
                    <button type="submit" className="border border-line px-3 py-1.5 text-sm text-muted hover:border-ink hover:text-ink">
                      {block.curation?.favorite ? "Unpin" : "Pin"}
                    </button>
                  </form>
                </div>
                <form action={updateBlockAction} className="space-y-3">
                  <input type="hidden" name="csrf" value={csrf} />
                  <input type="hidden" name="id" value={block.id} />
                  <label className="block text-xs text-muted">
                    Title
                    <input name="title" defaultValue={block.title} className="mt-1 w-full border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-ink" />
                  </label>
                  <label className="block text-xs text-muted">
                    Summary · English
                    <textarea name="summary" defaultValue={block.summary} rows={4} className="mt-1 w-full resize-y border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-ink" />
                  </label>
                  <label className="block text-xs text-muted">
                    Summary · 中文
                    <textarea name="summaryZh" defaultValue={block.summaryTranslations?.zh ?? ""} rows={4} className="mt-1 w-full resize-y border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-ink" />
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
                  <p className="mb-3 text-xs uppercase tracking-wide text-muted">Manual curation</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs text-muted">Topics</p>
                      <div className="space-y-2">
                        {linkedTopics.map(({ topic }) => (
                          <div key={topic.id} className="flex items-center justify-between gap-2 border border-line px-2 py-1.5 text-sm">
                            <Link href={`/topics/${topic.slug}`} className="underline">{topic.name}</Link>
                            <form action={removeBlockTopicLinkAction}>
                              <input type="hidden" name="csrf" value={csrf} />
                              <input type="hidden" name="blockId" value={block.id} />
                              <input type="hidden" name="topicId" value={topic.id} />
                              <button type="submit" className="text-xs text-muted underline hover:text-ink">Remove</button>
                            </form>
                          </div>
                        ))}
                        {linkedTopics.length === 0 ? <p className="text-xs text-muted">No topics linked.</p> : null}
                      </div>
                      <form action={addBlockTopicLinkAction} className="mt-2 flex gap-2">
                        <input type="hidden" name="csrf" value={csrf} />
                        <input type="hidden" name="blockId" value={block.id} />
                        <select name="topicId" className="min-w-0 flex-1 border border-line bg-white px-2 py-1.5 text-xs text-ink">
                          {addableTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                        </select>
                        <button type="submit" disabled={addableTopics.length === 0} className="border border-line px-2 py-1.5 text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-40">Add</button>
                      </form>
                    </div>
                    <div>
                      <p className="mb-2 text-xs text-muted">Nodes</p>
                      <div className="space-y-2">
                        {linkedNodes.map(({ node }) => (
                          <div key={node.id} className="flex items-center justify-between gap-2 border border-line px-2 py-1.5 text-sm">
                            <Link href={`/nodes/${node.slug}`} className="min-w-0 truncate underline">{node.name} <span className="text-xs text-muted">· {node.type}</span></Link>
                            <form action={removeBlockNodeLinkAction}>
                              <input type="hidden" name="csrf" value={csrf} />
                              <input type="hidden" name="blockId" value={block.id} />
                              <input type="hidden" name="nodeId" value={node.id} />
                              <button type="submit" className="text-xs text-muted underline hover:text-ink">Remove</button>
                            </form>
                          </div>
                        ))}
                        {linkedNodes.length === 0 ? <p className="text-xs text-muted">No nodes linked.</p> : null}
                      </div>
                      <form action={addBlockNodeLinkAction} className="mt-2 flex gap-2">
                        <input type="hidden" name="csrf" value={csrf} />
                        <input type="hidden" name="blockId" value={block.id} />
                        <select name="nodeId" className="min-w-0 flex-1 border border-line bg-white px-2 py-1.5 text-xs text-ink">
                          {addableNodes.map((node) => <option key={node.id} value={node.id}>{node.name} · {node.type}</option>)}
                        </select>
                        <button type="submit" disabled={addableNodes.length === 0} className="border border-line px-2 py-1.5 text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-40">Link</button>
                      </form>
                      <form action={addOrCreateBlockNodeLinkAction} className="mt-2 space-y-2 border border-line p-2">
                        <input type="hidden" name="csrf" value={csrf} />
                        <input type="hidden" name="blockId" value={block.id} />
                        <input name="nodeName" placeholder="New or existing node name" className="w-full border border-line px-2 py-1.5 text-xs text-ink outline-none focus:border-ink" />
                        <div className="flex gap-2">
                          <select name="nodeType" defaultValue="Concept" className="border border-line bg-white px-2 py-1.5 text-xs text-ink">
                            {(["Concept", "Project", "Technology", "Person", "Work", "Question", "Aesthetic"] as const).map((type) => <option key={type} value={type}>{type}</option>)}
                          </select>
                          <input name="nodeDescription" placeholder="Optional description" className="min-w-0 flex-1 border border-line px-2 py-1.5 text-xs text-ink outline-none focus:border-ink" />
                        </div>
                        <button type="submit" className="border border-line px-2 py-1.5 text-xs text-muted hover:border-ink hover:text-ink">Create / link node</button>
                      </form>
                    </div>
                  </div>
                </div>
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
            {authed ? <ProcessingTimeline block={block} job={latestJob} heartbeat={heartbeat} /> : null}
            {authed && blockedReason ? (
              <div className="border border-line p-4 text-sm text-muted">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted">Verification required</p>
                <p>This page appears to require browser verification or login. Retry later, or paste readable text manually.</p>
              </div>
            ) : null}
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
            <div className="border border-line p-4 text-sm">
              <p className="mb-3 text-xs uppercase tracking-wide text-muted">Internet Archive</p>
              {wayback.status === "available" && wayback.url ? (
                <div className="space-y-2">
                  <p className="text-muted">Archived copy available.</p>
                  <a href={wayback.url} target="_blank" rel="noreferrer" className="inline-block underline">Open Wayback copy</a>
                  {wayback.timestamp ? <p className="text-xs text-muted">Snapshot {wayback.timestamp}</p> : null}
                </div>
              ) : wayback.status === "missing" ? (
                <div className="space-y-3">
                  <p className="text-muted">No archive found on Wayback Machine.</p>
                  {authed ? (
                    <form action={submitBlockToWaybackAction} className="space-y-2">
                      <input type="hidden" name="csrf" value={csrf} />
                      <input type="hidden" name="id" value={block.id} />
                      <p className="text-xs leading-relaxed text-muted">Submitting may make this URL publicly discoverable on archive.org.</p>
                      <button type="submit" className="border border-line px-3 py-1.5 text-sm text-muted hover:border-ink hover:text-ink">Submit to Wayback Machine</button>
                    </form>
                  ) : null}
                </div>
              ) : wayback.status === "submitted" ? (
                <div className="space-y-2">
                  <p className="text-muted">Submitted to Wayback Machine. Capture may take a few minutes.</p>
                  {wayback.submittedAt ? <p className="text-xs text-muted">Submitted {new Date(wayback.submittedAt).toLocaleString()}</p> : null}
                </div>
              ) : wayback.status === "failed" ? (
                <div className="space-y-3">
                  <p className="text-muted">Wayback lookup failed.</p>
                  {wayback.error ? <p className="text-xs text-muted">{wayback.error}</p> : null}
                  {authed ? (
                    <form action={submitBlockToWaybackAction}>
                      <input type="hidden" name="csrf" value={csrf} />
                      <input type="hidden" name="id" value={block.id} />
                      <button type="submit" className="border border-line px-3 py-1.5 text-sm text-muted hover:border-ink hover:text-ink">Try submitting</button>
                    </form>
                  ) : null}
                </div>
              ) : (
                <p className="text-muted">Wayback lookup is pending.</p>
              )}
            </div>
            <div className="border border-line p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-muted">Connected nodes</p>
              <NodeChips block={block} nodes={nodes} topics={topics} />
            </div>
            <div className="border border-line p-4">
              <p className="mb-3 text-xs uppercase tracking-wide text-muted">Reference</p>
              <EvidenceList block={block} nodes={nodes} topics={topics} />
            </div>
            {authed && block.status !== "indexed" && block.status !== "failed" ? (
              <div className="border border-line p-4 text-sm text-muted">
                {heartbeat?.online ? "The worker is online. This page refreshes while processing." : "The background worker is offline. Queued processing will resume when it is running."}
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
