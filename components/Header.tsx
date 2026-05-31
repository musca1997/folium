import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";

export async function Header() {
  const authed = await isAuthenticated();

  return (
    <header className="border-b border-line px-5 py-4">
      <nav className="mx-auto flex max-w-7xl items-center justify-end text-sm">
        <div className="flex items-center gap-5 text-muted">
          <Link href="/" className="font-semibold text-ink">Library</Link>
          <Link href="/search">Search</Link>
          <Link href="/topics">Topics</Link>
          <Link href="/nodes">Nodes</Link>
          <Link href="/graph">Graph</Link>
          {authed ? <Link href="/processing">Processing</Link> : null}
          {authed ? (
            <Link href="/settings" className="border border-ink px-3 py-1 text-ink hover:bg-ink hover:text-white">Account</Link>
          ) : (
            <Link href="/login" className="border border-ink px-3 py-1 text-ink hover:bg-ink hover:text-white">Login</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
