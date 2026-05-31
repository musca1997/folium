import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { loginAction } from "@/app/actions";
import { isAuthenticated } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/", error } = await searchParams;
  if (await isAuthenticated()) redirect(next.startsWith("/") ? next : "/");

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <PageIntro eyebrow="Account" title="Log in" description="Sign in to save links, edit blocks, and decide what becomes public." />
        <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
          <form action={loginAction} className="space-y-4 border border-line p-5">
            <input type="hidden" name="next" value={next} />
            <label className="block text-sm">
              Username
              <input name="username" autoComplete="username" required className="mt-2 w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
            </label>
            <label className="block text-sm">
              Password
              <input type="password" name="password" autoComplete="current-password" required className="mt-2 w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
            </label>
            {error === "invalid" ? <p className="text-xs text-muted">Invalid username or password.</p> : null}
            {error === "limited" ? <p className="text-xs text-muted">Too many failed attempts. Try again later.</p> : null}
            <button className="border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-white" type="submit">
              Log in
            </button>
          </form>
          <aside className="border border-line p-5 text-sm leading-relaxed text-muted">
            <p className="text-xs uppercase tracking-wide">Access</p>
            <p className="mt-3">Guests can browse the public library. Logging in unlocks adding links, editing block metadata, and deleting saved blocks.</p>
            <p className="mt-4">Credentials are configured by <code>FOLIUM_USERNAME</code> and <code>FOLIUM_PASSWORD</code>.</p>
            <Link href="/" className="mt-5 inline-block underline">Back to library</Link>
          </aside>
        </section>
      </main>
    </>
  );
}
