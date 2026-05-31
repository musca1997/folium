"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function NodeSearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [, startTransition] = useTransition();

  useEffect(() => setQuery(initialQuery), [initialQuery]);

  useEffect(() => {
    const trimmed = query.trim();
    const handle = window.setTimeout(() => {
      const next = trimmed ? `${pathname}?q=${encodeURIComponent(trimmed)}` : pathname;
      startTransition(() => router.replace(next, { scroll: false }));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [pathname, query, router]);

  return (
    <form className="flex gap-2" action="/nodes">
      <input
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search pages, summaries, topics, nodes..."
        className="min-w-0 flex-1 border border-line px-3 py-2 text-sm outline-none focus:border-ink"
      />
      <button className="border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-white">Search</button>
      {initialQuery ? <Link href="/nodes" className="border border-line px-4 py-2 text-sm text-muted hover:border-ink hover:text-ink">Clear</Link> : null}
    </form>
  );
}
