"use client";

import { useMemo, useState } from "react";

type SummaryToggleProps = {
  summary: string;
  summaryZh?: string;
  fallback: string;
};

export function SummaryToggle({ summary, summaryZh, fallback }: SummaryToggleProps) {
  const hasZh = Boolean(summaryZh?.trim());
  const [language, setLanguage] = useState<"en" | "zh">(hasZh ? "zh" : "en");
  const text = useMemo(() => {
    if (language === "zh" && hasZh) return summaryZh?.trim() || fallback;
    return summary.trim() || fallback;
  }, [fallback, hasZh, language, summary, summaryZh]);

  return (
    <div className="mb-8 border-b border-line pb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-muted">Summary</p>
        <div className="flex border border-line text-xs">
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`px-2 py-1 ${language === "en" ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
            aria-pressed={language === "en"}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage("zh")}
            disabled={!hasZh}
            className={`border-l border-line px-2 py-1 ${language === "zh" ? "bg-ink text-white" : "text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"}`}
            aria-pressed={language === "zh"}
            title={hasZh ? "Show Chinese summary" : "Chinese summary is not available yet"}
          >
            中文
          </button>
        </div>
      </div>
      <p className="max-w-3xl text-base leading-relaxed text-ink">{text}</p>
    </div>
  );
}
