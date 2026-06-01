import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { createBackupAction, generateApiTokenAction, logoutAction, restoreBackupAction, revokeApiTokenAction, updateAiSettingsAction, updateCredentialsAction, updateSummaryLanguageSettingsAction } from "@/app/actions";
import { getAuthUser, getCsrfToken, getSecurityStatus, isAuthenticated } from "@/lib/auth";
import { listLibraryBackups } from "@/lib/backup";
import { getAiSettings, getSettings } from "@/lib/settings";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; ai?: string; summaryLanguages?: string; backup?: string; api?: string; apiToken?: string }> }) {
  if (!(await isAuthenticated())) redirect("/login?next=/settings");
  const [{ error, ai: aiStatus, summaryLanguages: summaryLanguagesStatus, backup: backupStatus, api: apiStatus, apiToken }, user, ai, settings, csrf, security, backups] = await Promise.all([searchParams, getAuthUser(), getAiSettings(), getSettings(), getCsrfToken(), getSecurityStatus(), listLibraryBackups()]);
  const apiTokens = settings.api.tokens ?? [];

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
            <form action={updateSummaryLanguageSettingsAction} className="space-y-4 border border-line p-5">
              <input type="hidden" name="csrf" value={csrf} />
              <p className="text-xs uppercase tracking-wide text-muted">Summary language</p>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" name="summaryLanguagesEnabled" defaultChecked={settings.summaryLanguages.enabled} />
                Enable multilingual summaries
              </label>
              <label className="block text-sm">
                Additional language
                <select name="preferredSummaryLanguage" defaultValue={settings.summaryLanguages.preferred === "zh" ? "zh" : "en"} className="mt-2 w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink">
                  <option value="en">English only</option>
                  <option value="zh">中文</option>
                </select>
              </label>
              {summaryLanguagesStatus === "updated" ? <p className="text-xs text-muted">Summary language settings saved.</p> : null}
              <button className="border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-white" type="submit">Save summary language</button>
            </form>
            <aside className="border border-line p-5 text-sm leading-relaxed text-muted">
              <p className="text-xs uppercase tracking-wide">Display</p>
              <p className="mt-3">When multilingual summaries are off, block pages show the English summary only.</p>
              <p className="mt-4">When enabled, Folium can generate and display an additional summary language. Currently only Chinese is available.</p>
            </aside>
          </section>

          <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4 border border-line p-5">
              <p className="text-xs uppercase tracking-wide text-muted">Agent API</p>
              <p className="text-sm leading-relaxed text-muted">Create API tokens for the Folium CLI, browser extension, and agent workflows. Each token is shown once.</p>
              {apiToken ? (
                <div className="border border-line bg-soft p-3">
                  <p className="text-xs uppercase tracking-wide text-muted">New token</p>
                  <code className="mt-2 block break-all text-sm text-ink">{apiToken}</code>
                </div>
              ) : null}
              {apiStatus === "revoked" ? <p className="text-xs text-muted">API token revoked.</p> : null}
              <form action={generateApiTokenAction} className="space-y-3">
                <input type="hidden" name="csrf" value={csrf} />
                <label className="block text-sm">
                  Token note
                  <input name="label" placeholder="Chrome extension, Firefox, CLI on laptop..." className="mt-2 w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
                </label>
                <button className="border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-white" type="submit">Generate token</button>
              </form>
              <div className="space-y-2 border-t border-line pt-4">
                <p className="text-xs uppercase tracking-wide text-muted">Active tokens</p>
                {apiTokens.length === 0 ? <p className="text-sm text-muted">No active tokens.</p> : null}
                {apiTokens.map((token) => (
                  <div key={token.id} className="flex items-start justify-between gap-3 border border-line p-3">
                    <div className="min-w-0 text-sm">
                      <p className="truncate text-ink">{token.label}</p>
                      <p className="mt-1 text-xs text-muted">Created {new Date(token.createdAt).toLocaleString()}</p>
                      <p className="mt-1 text-xs text-muted">Last used {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : "never"}</p>
                    </div>
                    <form action={revokeApiTokenAction}>
                      <input type="hidden" name="csrf" value={csrf} />
                      <input type="hidden" name="tokenId" value={token.id} />
                      <button className="border border-line px-3 py-1.5 text-xs text-muted hover:border-ink hover:text-ink" type="submit">Delete</button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
            <aside className="border border-line p-5 text-sm leading-relaxed text-muted">
              <p className="text-xs uppercase tracking-wide">CLI access</p>
              <p className="mt-3">Use separate tokens for command-line, extension, and agent access. Keep tokens private and delete any token that may have been exposed.</p>
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
