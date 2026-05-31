import Link from "next/link";
import { BlockGrid } from "@/components/BlockGrid";
import { Header } from "@/components/Header";
import { getCsrfToken, isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";

export const revalidate = 2;

const PAGE_SIZE = 50;

function pageHref(page: number, visibility: string) {
  const params = new URLSearchParams();
  if (visibility !== "all") params.set("visibility", visibility);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ visibility?: string; page?: string }> }) {
  const [{ visibility, page }, authed] = await Promise.all([searchParams, isAuthenticated()]);
  const csrf = authed ? await getCsrfToken() : "";
  const [blocks, nodes, topics, jobs] = await Promise.all([
    authed ? libraryStore.listBlocks() : libraryStore.listPublicBlocks(),
    authed ? libraryStore.listNodes() : libraryStore.listPublicNodes(),
    authed ? libraryStore.listTopics() : libraryStore.listPublicTopics(),
    authed ? libraryStore.listJobs() : Promise.resolve([]),
  ]);
  const visibleBlocks = blocks;
  const activeVisibility = visibility === "public" || visibility === "private" ? visibility : "all";
  const filteredBlocks = activeVisibility === "all" ? visibleBlocks : visibleBlocks.filter((block) => block.visibility === activeVisibility);
  const libraryBlocks = [...filteredBlocks].sort((a, b) => Number(Boolean(b.curation?.favorite)) - Number(Boolean(a.curation?.favorite)));
  const publicCount = visibleBlocks.filter((block) => block.visibility === "public").length;
  const privateCount = authed ? blocks.filter((block) => block.visibility !== "public").length : 0;
  const processingCount = jobs.filter((job) => job.status === "queued" || job.status === "running").length;
  const indexedCount = filteredBlocks.filter((block) => block.status === "indexed").length;
  const totalPages = Math.max(1, Math.ceil(libraryBlocks.length / PAGE_SIZE));
  const requestedPage = Number.parseInt(page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const start = (currentPage - 1) * PAGE_SIZE;
  const paginatedBlocks = libraryBlocks.slice(start, start + PAGE_SIZE);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-6">
        <section className="mb-8 border-b border-line pb-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.24em] text-muted">Save, connect, revisit</p>
              <h1 className="max-w-4xl text-4xl font-normal leading-tight tracking-tight md:text-6xl">Folium</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink">
                A self-hosted, LLM-assisted link curator that turns saved pages into a living wiki.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                Save links, capture previews, extract readable text, and let your library grow into connected concept nodes.
              </p>
            </div>

            <div className="grid grid-cols-3 border border-line text-center">
              <div className="border-r border-line p-4">
                <p className="text-2xl font-normal">{filteredBlocks.length}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted">Blocks</p>
              </div>
              <div className="border-r border-line p-4">
                <p className="text-2xl font-normal">{nodes.length}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted">Nodes</p>
              </div>
              <div className="p-4">
                <p className="text-2xl font-normal">{processingCount}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted">Queued</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 text-sm">
            <Link href="/add" className="border border-ink px-3 py-2 hover:bg-ink hover:text-white">
              Save a link
            </Link>
            <Link href="/graph" className="border border-line px-3 py-2 text-muted hover:border-ink hover:text-ink">
              View graph
            </Link>
            {processingCount > 0 ? (
              <Link href="/processing" className="border border-line px-3 py-2 text-muted hover:border-ink hover:text-ink">
                {processingCount} processing
              </Link>
            ) : null}
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-normal tracking-tight">Library</h2>
              <p className="mt-1 text-sm text-muted">
                {indexedCount > 0 ? `${indexedCount} indexed references, arranged as a visual archive.` : "A quiet library for the web you keep."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href="/" className={`border px-3 py-1.5 ${activeVisibility === "all" ? "border-ink text-ink" : "border-line text-muted hover:border-ink hover:text-ink"}`}>All {visibleBlocks.length}</Link>
              <Link href="/?visibility=public" className={`border px-3 py-1.5 ${activeVisibility === "public" ? "border-ink text-ink" : "border-line text-muted hover:border-ink hover:text-ink"}`}>Public {publicCount}</Link>
              {authed ? <Link href="/?visibility=private" className={`border px-3 py-1.5 ${activeVisibility === "private" ? "border-ink text-ink" : "border-line text-muted hover:border-ink hover:text-ink"}`}>Private {privateCount}</Link> : null}
            </div>
          </div>
          <BlockGrid blocks={paginatedBlocks} nodes={nodes} topics={topics} csrf={csrf} authed={authed} />
          {totalPages > 1 ? (
            <nav className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm" aria-label="Library pagination">
              <p className="text-muted">
                Showing {start + 1}–{Math.min(start + PAGE_SIZE, libraryBlocks.length)} of {libraryBlocks.length} references
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={pageHref(currentPage - 1, activeVisibility)}
                  aria-disabled={currentPage === 1}
                  className={`border px-3 py-1.5 ${currentPage === 1 ? "pointer-events-none border-line text-muted opacity-40" : "border-line text-muted hover:border-ink hover:text-ink"}`}
                >
                  Previous
                </Link>
                <span className="px-2 text-muted">Page {currentPage} / {totalPages}</span>
                <Link
                  href={pageHref(currentPage + 1, activeVisibility)}
                  aria-disabled={currentPage === totalPages}
                  className={`border px-3 py-1.5 ${currentPage === totalPages ? "pointer-events-none border-line text-muted opacity-40" : "border-line text-muted hover:border-ink hover:text-ink"}`}
                >
                  Next
                </Link>
              </div>
            </nav>
          ) : null}
        </section>
      </main>
    </>
  );
}
