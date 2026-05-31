import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { getCsrfToken, isAuthenticated } from "@/lib/auth";
import { addUrlAction } from "../actions";

export default async function AddPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await isAuthenticated())) redirect("/login?next=/add");
  const [{ error }, csrf] = await Promise.all([searchParams, getCsrfToken()]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <PageIntro
          eyebrow="Capture"
          title="Save a link"
          description="Paste a URL and Folium will extract metadata, capture a preview, and connect it to wiki nodes."
        />
        <form action={addUrlAction} className="space-y-4">
          <input type="hidden" name="csrf" value={csrf} />
          <div className="flex gap-2">
            <input
              name="url"
              type="text"
              required
              placeholder="https://example.com/..."
              className="min-w-0 flex-1 border border-line px-3 py-2 text-sm outline-none focus:border-ink"
            />
            <button className="border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-white" type="submit">
              Add
            </button>
          </div>
          {error === "unsafe-url" ? <p className="text-xs text-muted">That URL is not allowed. Use a public http or https URL.</p> : null}
          {error === "missing-url" ? <p className="text-xs text-muted">Paste a URL first.</p> : null}
          <fieldset className="border border-line p-4">
            <legend className="px-1 text-xs uppercase tracking-wide text-muted">Visibility</legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="visibility" value="private" defaultChecked />
                <span>Private</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="visibility" value="public" />
                <span>Public</span>
              </label>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">Private is the default. Public marks links that are ready to share later.</p>
          </fieldset>
        </form>
      </main>
    </>
  );
}
