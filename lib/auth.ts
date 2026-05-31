import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "folium_session";
const authPath = join(process.cwd(), "data", "auth.json");

type AuthConfig = { username: string; passwordHash: string; updatedAt: string | null };

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function readAuthConfig(): Promise<AuthConfig> {
  try {
    return JSON.parse(await readFile(authPath, "utf8")) as AuthConfig;
  } catch {
    return {
      username: process.env.FOLIUM_USERNAME || "admin",
      passwordHash: hashPassword(process.env.FOLIUM_PASSWORD || "folium"),
      updatedAt: null,
    };
  }
}

async function writeAuthConfig(config: AuthConfig): Promise<void> {
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(authPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function sessionSecret(): string {
  return process.env.FOLIUM_SESSION_SECRET || process.env.FOLIUM_PASSWORD || "folium";
}

function sign(username: string): string {
  return createHash("sha256").update(`${username}:${sessionSecret()}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function getAuthUser(): Promise<{ username: string }> {
  const config = await readAuthConfig();
  return { username: config.username };
}

export async function isAuthenticated(): Promise<boolean> {
  const config = await readAuthConfig();
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return false;
  const [username, signature] = value.split(".");
  if (!username || !signature) return false;
  return username === config.username && safeEqual(signature, sign(username));
}

export async function login(username: string, password: string): Promise<boolean> {
  const config = await readAuthConfig();
  if (username !== config.username || hashPassword(password) !== config.passwordHash) return false;
  const store = await cookies();
  store.set(COOKIE_NAME, `${username}.${sign(username)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function updateCredentials(currentPassword: string, username: string, newPassword: string): Promise<boolean> {
  const config = await readAuthConfig();
  if (hashPassword(currentPassword) !== config.passwordHash) return false;
  const nextUsername = username.trim();
  if (!nextUsername || newPassword.length < 4) return false;
  await writeAuthConfig({ username: nextUsername, passwordHash: hashPassword(newPassword), updatedAt: new Date().toISOString() });
  await logout();
  return true;
}
