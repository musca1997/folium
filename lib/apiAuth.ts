import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { addApiTokenRecord, getSettings, markApiTokenUsed, removeApiTokenRecord, updateApiSettings } from "@/lib/settings";

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createApiToken(): string {
  return `folium_${randomBytes(32).toString("base64url")}`;
}

function makeTokenId(): string {
  return `tok_${randomBytes(8).toString("hex")}`;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function cleanLabel(label?: string): string {
  const value = label?.replace(/\s+/g, " ").trim();
  return value ? value.slice(0, 80) : "Agent token";
}

export async function generateApiToken(label?: string): Promise<{ id: string; token: string }> {
  const token = createApiToken();
  const id = makeTokenId();
  await addApiTokenRecord({ id, label: cleanLabel(label), tokenHash: hashApiToken(token), createdAt: new Date().toISOString() });
  return { id, token };
}

export async function revokeApiToken(id?: string): Promise<void> {
  if (id) {
    await removeApiTokenRecord(id);
    return;
  }
  await updateApiSettings({ tokenHash: null, updatedAt: new Date().toISOString() });
}

export async function verifyApiRequest(request: Request): Promise<boolean> {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const token = match[1]?.trim();
  if (!token) return false;
  const settings = await getSettings();
  const tokenHash = hashApiToken(token);
  const found = (settings.api.tokens ?? []).find((record) => safeEqual(tokenHash, record.tokenHash));
  if (!found) return false;
  await markApiTokenUsed(found.id);
  return true;
}

export async function requireApiAuth(request: Request): Promise<Response | null> {
  if (await verifyApiRequest(request)) return null;
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
