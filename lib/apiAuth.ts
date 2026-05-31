import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getSettings, updateApiSettings } from "@/lib/settings";

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createApiToken(): string {
  return `folium_${randomBytes(32).toString("base64url")}`;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function generateApiToken(): Promise<string> {
  const token = createApiToken();
  await updateApiSettings({ tokenHash: hashApiToken(token), updatedAt: new Date().toISOString() });
  return token;
}

export async function revokeApiToken(): Promise<void> {
  await updateApiSettings({ tokenHash: null, updatedAt: new Date().toISOString() });
}

export async function verifyApiRequest(request: Request): Promise<boolean> {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const token = match[1]?.trim();
  if (!token) return false;
  const settings = await getSettings();
  const tokenHash = settings.api?.tokenHash;
  if (!tokenHash) return false;
  return safeEqual(hashApiToken(token), tokenHash);
}

export async function requireApiAuth(request: Request): Promise<Response | null> {
  if (await verifyApiRequest(request)) return null;
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
