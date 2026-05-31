import type { Block, Job } from "@/lib/store/types";

const steps = [
  { key: "queued", label: "Queued", description: "Waiting for the background worker." },
  { key: "fetching", label: "Fetch", description: "Downloading metadata and readable text." },
  { key: "browser", label: "Browser fallback", description: "Opening the page in Chromium if direct fetch is blocked or too thin." },
  { key: "screenshotting", label: "Snapshot", description: "Capturing a visual preview." },
  { key: "thinking", label: "Analyze", description: "Asking the LLM to create summary, topics, nodes, and references." },
  { key: "indexed", label: "Indexed", description: "Saved into the visual wiki." },
] as const;

type StepKey = (typeof steps)[number]["key"];

function currentStep(block: Block, job: Job | null): StepKey {
  if (block.status === "indexed") return "indexed";
  if (block.status === "failed" || job?.status === "failed") return "indexed";
  if (block.status === "thinking") return "thinking";
  if (block.status === "screenshotting") return "screenshotting";
  if (block.status === "fetching") return block.metadata.fetchExtractionError ? "browser" : "fetching";
  return "queued";
}

function isDone(step: StepKey, current: StepKey, block: Block): boolean {
  const order = steps.findIndex((item) => item.key === step);
  const currentOrder = steps.findIndex((item) => item.key === current);
  if (block.status === "indexed") return order <= currentOrder;
  return order < currentOrder;
}

export function ProcessingTimeline({ block, job }: { block: Block; job: Job | null }) {
  const current = currentStep(block, job);
  const active = block.status !== "indexed" && block.status !== "failed";
  const error = job?.error || (typeof block.metadata.extractionError === "string" ? block.metadata.extractionError : null);

  return (
    <div className="border border-line p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Processing</p>
          <p className="mt-1 text-sm text-ink">{block.status === "indexed" ? "Capture complete" : block.status === "failed" ? "Processing failed" : "Capture in progress"}</p>
        </div>
        {active ? <span className="border border-line px-2 py-1 text-xs uppercase tracking-wide text-muted">Auto-refreshing</span> : null}
      </div>
      <div className="space-y-3">
        {steps.map((step) => {
          const done = isDone(step.key, current, block);
          const here = current === step.key && block.status !== "indexed";
          const skippedBrowser = step.key === "browser" && block.metadata.extractionMethod !== "browser" && current !== "browser";
          return (
            <div key={step.key} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3 text-sm">
              <div className={`mt-1 h-3 w-3 rounded-full border ${done ? "border-ink bg-ink" : here ? "border-ink" : "border-line"}`} />
              <div className={skippedBrowser ? "text-muted/70" : ""}>
                <p className="flex items-center gap-2">
                  <span>{step.label}</span>
                  {here ? <span className="text-xs text-muted">now</span> : null}
                  {skippedBrowser ? <span className="text-xs text-muted">if needed</span> : null}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
      {block.metadata.extractionMethod ? <p className="mt-4 text-xs text-muted">Extraction method: {String(block.metadata.extractionMethod)}</p> : null}
      {job ? <p className="mt-1 text-xs text-muted">Job: {job.type} · {job.status}</p> : null}
      {error ? <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted">{error}</p> : null}
    </div>
  );
}
