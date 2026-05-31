import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { createBackupAction, logoutAction, restoreBackupAction, updateAiSettingsAction, updateCredentialsAction } from "@/app/actions";
import { getAuthUser, getCsrfToken, getSecurityStatus, isAuthenticated } from "@/lib/auth";
import { listLibraryBackups } from "@/lib/backup";
import { getAiSettings } from "@/lib/settings";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; ai?: string; backup?: string }> }) {
  if (!(await isAuthenticated())) redirect("/login?next=/settings");
  const [{ error, ai: aiStatus, backup: backupStatus }, user, ai, csrf, security, backups] = await Promise.all([searchParams, getAuthUser(), getAiSettings(), getCsrfToken(), getSecurityStatus(), listLibraryBackups()]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <PageIntro eyebrow="Account" title="Settings" description="Manage login credentials and LLM API settings for this self-hosted Folium instance." />
        <div className="space-y-8">
          <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
            <form action={updateCredentialsAction} className="space-y-4 border border-line p-5">
              <input type="hidden" name="csrf" value={csrf} />
              <p className="text-xs uppercase tracking-wide text-muted">Login</p>
              <label className="block text-sm">
                Username
                <input name="username" defaultValue={user.username} required className="mt-2 w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
              </label>
              <label className="block text-sm">
                Current password
                <input type="password" name="currentPassword" required className="mt-2 w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
              </label>
              <label className="block text-sm">
                New password
                <input type="password" name="newPassword" required minLength={10} className="mt-2 w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
              </label>
              <label className="block text-sm">
                Confirm new password
                <input type="password" name="confirmPassword" required minLength={10} className="mt-2 w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
              </label>
              {error === "confirm" ? <p className="text-xs text-muted">New password and confirmation do not match.</p> : null}
              {error === "invalid" ? <p className="text-xs text-muted">Current password is wrong, or the new username/password is invalid.</p> : null}
              <button className="border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-white" type="submit">Save login</button>
            </form>
            <aside className="border border-line p-5 text-sm leading-relaxed text-muted">
              <p className="text-xs uppercase tracking-wide">Security</p>
              <p className="mt-3">Changing credentials logs you out. Log in again with the new username and password.</p>
              <p className="mt-4">Credentials are stored locally in <code>data/auth.json</code>.</p>
              {!security.strongSessionSecret ? <p className="mt-4">Warning: set a strong <code>FOLIUM_SESSION_SECRET</code> before exposing this instance publicly.</p> : null}
              {security.usingDefaultAuth ? <p className="mt-4">Warning: this instance is still using default auth. Change it before public deployment.</p> : null}
              <form action={logoutAction} className="mt-5">
                <input type="hidden" name="csrf" value={csrf} />
                <button type="submit" className="border border-ink px-3 py-1.5 text-ink hover:bg-ink hover:text-white">Logout</button>
              </form>
            </aside>
          </section>

          <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
            <form action={updateAiSettingsAction} className="space-y-4 border border-line p-5">
              <input type="hidden" name="csrf" value={csrf} />
              <p className="text-xs uppercase tracking-wide text-muted">AI provider</p>
              <label className="block text-sm">
                API key
                <input name="apiKey" type="password" placeholder={ai.apiKey ? "Configured — leave blank to keep" : "sk-..."} className="mt-2 w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
              </label>
              <label className="block text-sm">
                Base URL
                <input name="baseUrl" defaultValue={ai.baseUrl || process.env.OPENAI_BASE_URL || ""} placeholder="https://api.openai.com/v1/chat/completions" className="mt-2 w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
              </label>
              <label className="block text-sm">
                Model
                <input name="model" defaultValue={ai.model || process.env.OPENAI_MODEL || ""} placeholder="gpt-5.4" className="mt-2 w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" name="clearApiKey" />
                Clear saved API key
              </label>
              {aiStatus === "updated" ? <p className="text-xs text-muted">AI settings saved.</p> : null}
              <button className="border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-white" type="submit">Save AI settings</button>
            </form>
            <aside className="border border-line p-5 text-sm leading-relaxed text-muted">
              <p className="text-xs uppercase tracking-wide">LLM Wiki</p>
              <p className="mt-3">The saved key is used for summaries, topics, wiki nodes, claims, and evidence extraction.</p>
              <p className="mt-4">Status: {ai.apiKey || process.env.OPENAI_API_KEY ? "API key configured" : "No API key configured"}.</p>
              <p className="mt-4">Keys are stored locally in <code>data/settings.json</code> and are never displayed back.</p>
            </aside>
          </section>

          <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4 border border-line p-5">
              <p className="text-xs uppercase tracking-wide text-muted">Backup / restore</p>
              <form action={createBackupAction}>
                <input type="hidden" name="csrf" value={csrf} />
                <button className="border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-white" type="submit">Create backup</button>
              </form>
              {backupStatus === "created" ? <p className="text-xs text-muted">Backup created.</p> : null}
              {backupStatus === "restored" ? <p className="text-xs text-muted">Backup restored.</p> : null}
              {backupStatus === "confirm" ? <p className="text-xs text-muted">Type restore to confirm.</p> : null}
              <form action={restoreBackupAction} className="space-y-3 border-t border-line pt-4">
                <input type="hidden" name="csrf" value={csrf} />
                <label className="block text-sm">Backup
                  <select name="backup" className="mt-2 w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink">
                    {backups.map((backup) => <option key={backup.name} value={backup.name}>{backup.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm">Type restore to confirm
                  <input name="confirm" className="mt-2 w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
                </label>
                <button disabled={backups.length === 0} className="border border-line px-4 py-2 text-sm text-muted hover:border-ink hover:text-ink disabled:opacity-40" type="submit">Restore selected backup</button>
              </form>
            </div>
            <aside className="border border-line p-5 text-sm leading-relaxed text-muted">
              <p className="text-xs uppercase tracking-wide">Local snapshots</p>
              <p className="mt-3">Backups are stored under <code>data/backups</code>. Restoring creates a safety backup of the current library first.</p>
              <p className="mt-4">Available backups: {backups.length}</p>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
