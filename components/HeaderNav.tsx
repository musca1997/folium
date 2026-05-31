"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/topics") return pathname.startsWith("/topics") || pathname.startsWith("/nodes");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navClass(pathname: string, href: string): string {
  return isActive(pathname, href) ? "font-semibold text-ink" : "text-muted hover:text-ink";
}

export function HeaderNav({ authed }: { authed: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-7xl items-center justify-end text-sm">
      <div className="flex items-center gap-5">
        <Link href="/" className={navClass(pathname, "/")}>Library</Link>
        <Link href="/topics" className={navClass(pathname, "/topics")}>Topics</Link>
        <Link href="/search" className={navClass(pathname, "/search")}>Search</Link>
        <Link href="/graph" className={navClass(pathname, "/graph")}>Graph</Link>
        {authed ? <Link href="/processing" className={navClass(pathname, "/processing")}>Processing</Link> : null}
        <Link href="/about" className={navClass(pathname, "/about")}>About</Link>
        {authed ? (
          <Link href="/settings" className={`border border-ink px-3 py-1 text-ink hover:bg-ink hover:text-white ${isActive(pathname, "/settings") ? "font-semibold" : ""}`}>Account</Link>
        ) : (
          <Link href="/login" className={`border border-ink px-3 py-1 text-ink hover:bg-ink hover:text-white ${isActive(pathname, "/login") ? "font-semibold" : ""}`}>Login</Link>
        )}
      </div>
    </nav>
  );
}
