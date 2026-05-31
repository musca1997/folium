import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";
import type { JobStatus } from "@/lib/store/types";

export const revalidate = 2;

const statusLabels: Record<JobStatus, string> = {
  queued: "Queued",
  running: "Running",
  done: "Done",
  failed: "Failed",
};

export default async function ProcessingPage() {
  if (!(await isAuthenticated())) redirect("/login?next=/processing");
  const [jobs, summary] = await Promise.all([libraryStore.listJobsWithBlocks(), libraryStore.getJobSummary()]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-6">
        <PageIntro
          eyebrow="Background worker"
          title="Processing"
          description="Queued and recent jobs for metadata extraction, screenshots, and LLM wiki classification."
        />

        <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(Object.keys(statusLabels) as JobStatus[]).map((status) => (
            <div key={status} className="border border-line p-4">
              <p className="text-xs uppercase tracking-wide text-muted">{statusLabels[status]}</p>
              <p className="mt-2 text-2xl font-normal">{summary[status]}</p>
            </div>
          ))}
        </section>

        <section className="border border-line">
          <div className="grid grid-cols-[120px_140px_minmax(0,1fr)_160px] border-b border-line px-3 py-2 text-xs uppercase tracking-wide text-muted">
            <div>Status</div>
            <div>Type</div>
            <div>Block</div>
            <div>Updated</div>
          </div>
          {jobs.length === 0 ? (
            <div className="p-6 text-sm text-muted">No jobs yet.</div>
          ) : (
            jobs.map(({ job, block }) => (
              <div key={job.id} className="grid grid-cols-[120px_140px_minmax(0,1fr)_160px] gap-3 border-b border-line px-3 py-3 text-sm last:border-b-0">
                <div>
                  <span className="border border-line px-2 py-1 text-xs uppercase tracking-wide text-muted">{statusLabels[job.status]}</span>
                </div>
                <div className="text-xs text-muted">{job.type}</div>
                <div className="min-w-0">
                  {block ? (
                    <Link href={`/blocks/${block.id}`} className="hover:underline">
                      <span className="block truncate">{block.title || block.url}</span>
                      <span className="mt-1 block text-xs text-muted">{block.domain} · {block.status}</span>
                    </Link>
                  ) : (
                    <span className="text-muted">Missing block: {job.blockId}</span>
                  )}
                  {job.error ? <p className="mt-2 text-xs text-muted">{job.error}</p> : null}
                </div>
                <div className="text-xs text-muted">{job.updatedAt}</div>
              </div>
            ))
          )}
        </section>
      </main>
    </>
  );
}
