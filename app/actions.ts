"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createLibraryBackup, restoreLibraryBackup } from "@/lib/backup";
import { isAuthenticated, login, logout, updateCredentials, verifyCsrfToken } from "@/lib/auth";
import { updateAiSettings } from "@/lib/settings";
import { assertSafePublicUrl } from "@/lib/security/urlSafety";
import { libraryStore } from "@/lib/store/library";

async function requireAuthAndCsrf(formData: FormData, next = "/login") {
  if (!(await isAuthenticated())) redirect(next);
  if (!(await verifyCsrfToken(String(formData.get("csrf") ?? "")))) throw new Error("Invalid CSRF token");
}

function requiresConfirmation(formData: FormData, expected: string): boolean {
  return String(formData.get("confirm") ?? "").trim() === expected;
}

export async function addUrlAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login?next=/add");
  const url = String(formData.get("url") ?? "").trim();
  if (!url) redirect("/add?error=missing-url");
  let safeUrl: string;
  try {
    safeUrl = await assertSafePublicUrl(url);
  } catch {
    redirect("/add?error=unsafe-url");
  }

  const visibility = formData.get("visibility") === "public" ? "public" : "private";
  const block = await libraryStore.createUrlBlock(safeUrl, visibility);
  await libraryStore.enqueueProcessBlock(block.id);
  redirect(`/blocks/${block.id}`);
}

export async function updateBlockAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/");

  await libraryStore.updateBlock(id, {
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    description: String(formData.get("description") ?? ""),
    visibility: formData.get("visibility") === "public" ? "public" : "private",
  });

  for (const path of ["/", `/blocks/${id}`, "/topics", "/nodes", "/graph", "/search"]) revalidatePath(path);
  redirect(`/blocks/${id}`);
}

export async function deleteBlockAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login");
  const id = String(formData.get("id") ?? "");
  if (id && requiresConfirmation(formData, "delete")) await libraryStore.deleteBlock(id);
  for (const path of ["/", "/topics", "/nodes", "/graph", "/search", "/processing"]) revalidatePath(path);
  redirect("/");
}

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const result = await login(username, password);
  if (result === "limited") redirect(`/login?error=limited&next=${encodeURIComponent(next)}`);
  if (result !== "ok") redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutAction(formData: FormData) {
  if (await isAuthenticated()) {
    if (!(await verifyCsrfToken(String(formData.get("csrf") ?? "")))) throw new Error("Invalid CSRF token");
  }
  await logout();
  redirect("/");
}

export async function updateCredentialsAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login?next=/settings");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (newPassword !== confirmPassword) redirect("/settings?error=confirm");
  const ok = await updateCredentials(
    String(formData.get("currentPassword") ?? ""),
    String(formData.get("username") ?? ""),
    newPassword,
  );
  if (!ok) redirect("/settings?error=invalid");
  redirect("/login?next=/settings&updated=1");
}

export async function updateAiSettingsAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login?next=/settings");
  await updateAiSettings({
    apiKey: String(formData.get("apiKey") ?? ""),
    baseUrl: String(formData.get("baseUrl") ?? ""),
    model: String(formData.get("model") ?? ""),
    clearApiKey: formData.get("clearApiKey") === "on",
  });
  redirect("/settings?ai=updated");
}

export async function createBackupAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login?next=/settings");
  await createLibraryBackup();
  redirect("/settings?backup=created");
}

export async function restoreBackupAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login?next=/settings");
  if (!requiresConfirmation(formData, "restore")) redirect("/settings?backup=confirm");
  await restoreLibraryBackup(String(formData.get("backup") ?? ""));
  for (const path of ["/", "/topics", "/nodes", "/graph", "/search", "/processing", "/settings"]) revalidatePath(path);
  redirect("/settings?backup=restored");
}

export async function reprocessBlockWithAiAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/");
  await libraryStore.enqueueAnalyzeBlock(id);
  for (const path of [`/blocks/${id}`, "/processing", "/topics", "/nodes", "/graph"]) revalidatePath(path);
  redirect(`/blocks/${id}`);
}

export async function retryBlockProcessingAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/");
  await libraryStore.retryBlockProcessing(id);
  for (const path of [`/blocks/${id}`, "/processing", "/topics", "/nodes", "/graph"]) revalidatePath(path);
  redirect(`/blocks/${id}`);
}

export async function recaptureBlockAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/");
  await libraryStore.enqueueRecaptureBlock(id);
  for (const path of [`/blocks/${id}`, "/processing"]) revalidatePath(path);
  redirect(`/blocks/${id}`);
}

function taxonomyRevalidate() {
  for (const path of ["/taxonomy", "/topics", "/nodes", "/graph", "/search", "/"]) revalidatePath(path);
}

export async function updateTopicAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login?next=/taxonomy");
  await libraryStore.updateTopic(String(formData.get("id") ?? ""), { name: String(formData.get("name") ?? ""), description: String(formData.get("description") ?? ""), aliases: String(formData.get("aliases") ?? "") });
  taxonomyRevalidate(); redirect("/taxonomy");
}
export async function mergeTopicAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login?next=/taxonomy");
  await libraryStore.mergeTopic(String(formData.get("sourceId") ?? ""), String(formData.get("targetId") ?? ""));
  taxonomyRevalidate(); redirect("/taxonomy");
}
export async function deleteTopicAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login?next=/taxonomy");
  if (!requiresConfirmation(formData, "delete")) redirect("/taxonomy");
  await libraryStore.deleteTopic(String(formData.get("id") ?? ""));
  taxonomyRevalidate(); redirect("/taxonomy");
}
export async function updateNodeAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login?next=/taxonomy");
  await libraryStore.updateNode(String(formData.get("id") ?? ""), { name: String(formData.get("name") ?? ""), description: String(formData.get("description") ?? ""), aliases: String(formData.get("aliases") ?? ""), type: String(formData.get("type") ?? "Concept") });
  taxonomyRevalidate(); redirect("/taxonomy");
}
export async function mergeNodeAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login?next=/taxonomy");
  await libraryStore.mergeNode(String(formData.get("sourceId") ?? ""), String(formData.get("targetId") ?? ""));
  taxonomyRevalidate(); redirect("/taxonomy");
}
export async function deleteNodeAction(formData: FormData) {
  await requireAuthAndCsrf(formData, "/login?next=/taxonomy");
  if (!requiresConfirmation(formData, "delete")) redirect("/taxonomy");
  await libraryStore.deleteNode(String(formData.get("id") ?? ""));
  taxonomyRevalidate(); redirect("/taxonomy");
}
