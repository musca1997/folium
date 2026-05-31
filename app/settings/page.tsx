import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { createBackupAction, generateApiTokenAction, logoutAction, restoreBackupAction, revokeApiTokenAction, updateAiSettingsAction, updateCredentialsAction } from "@/app/actions";
import { getAuthUser, getCsrfToken, getSecurityStatus, isAuthenticated } from "@/lib/auth";
import { listLibraryBackups } from "@/lib/backup";
import { getAiSettings } from "@/lib/settings";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; ai?: string; backup?: string; api?: string; apiToken?: string }> }) {
  if (!(await isAuthenticated())) redirect("/login?next=/settings");
  const [{ error, ai: aiStatus, backup: backupStatus, api: apiStatus, apiToken }, user, ai, csrf, security, backups] = await Promise.all([searchParams, getAuthUser(), getAiSettings(), getCsrfToken(), getSecurityStatus(), listLibraryBackups()]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <PageIntro eyebrow="Account" title="Settings" description="Manage your login, AI provider, and library backups." />
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
              <p className="mt-4">Use a strong password, especially if this instance is reachable from the public internet.</p>
              {!security.strongSessionSecret ? <p className="mt-4">Warning: your session secret is not configured strongly enough for public deployment.</p> : null}
              {security.usingDefaultAuth ? <p className="mt-4">Warning: this instance is still using default login credentials. Change them before public deployment.</p> : null}
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
              <p className="mt-4">Saved keys are never displayed back in the interface.</p>
            </aside>
          </section>

          <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4 border border-line p-5">
              <p className="text-xs uppercase tracking-wide text-muted">Agent API</p>
              <p className="text-sm leading-relaxed text-muted">Create an API token for the Folium CLI, browser extension, and agent workflows. The token is shown once. Generating a new token replaces the previous one.</p>
              {apiToken ? (
                <div className="border border-line bg-soft p-3">
                  <p className="text-xs uppercase tracking-wide text-muted">New token</p>
                  <code className="mt-2 block break-all text-sm text-ink">{apiToken}</code>
                </div>
              ) : null}
              {apiStatus === "revoked" ? <p className="text-xs text-muted">API token revoked.</p> : null}
              <div className="flex flex-wrap gap-2">
                <form action={generateApiTokenAction}>
                  <input type="hidden" name="csrf" value={csrf} />
                  <button className="border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-white" type="submit">Generate token</button>
                </form>
                <form action={revokeApiTokenAction}>
                  <input type="hidden" name="csrf" value={csrf} />
                  <button className="border border-line px-4 py-2 text-sm text-muted hover:border-ink hover:text-ink" type="submit">Revoke token</button>
                </form>
              </div>
            </div>
            <aside className="border border-line p-5 text-sm leading-relaxed text-muted">
              <p className="text-xs uppercase tracking-wide">CLI access</p>
              <p className="mt-3">Use API tokens for command-line, extension, and agent access. Keep tokens private and revoke them if exposed.</p>
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
              <p className="mt-3">Restoring creates a safety backup of the current library first.</p>
              <p className="mt-4">Available backups: {backups.length}</p>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
