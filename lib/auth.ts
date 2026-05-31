import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { hashPassword, isLegacyPasswordHash, verifyPassword } from "@/lib/security/password";
import { clearLoginFailures, isLoginLimited, recordLoginFailure } from "@/lib/security/rateLimit";

const COOKIE_NAME = "folium_session";
const CSRF_COOKIE_NAME = "folium_csrf";
const authPath = join(process.cwd(), "data", "auth.json");

type AuthConfig = { username: string; passwordHash: string; updatedAt: string | null };

function legacySha256(password: string): string {
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  return createHash("sha256").update(password).digest("hex");
}

async function readAuthConfig(): Promise<AuthConfig> {
  try {
    return JSON.parse(await readFile(authPath, "utf8")) as AuthConfig;
  } catch {
    return {
      username: process.env.FOLIUM_USERNAME || "admin",
      passwordHash: process.env.FOLIUM_PASSWORD ? hashPassword(process.env.FOLIUM_PASSWORD) : legacySha256("folium"),
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

export function hasStrongSessionSecret(): boolean {
  const secret = process.env.FOLIUM_SESSION_SECRET;
  return Boolean(secret && secret.length >= 32 && secret !== "change-this-to-a-long-random-string");
}

export function isUsingDefaultAuth(config?: AuthConfig): boolean {
  return !process.env.FOLIUM_USERNAME && !process.env.FOLIUM_PASSWORD && !config?.updatedAt;
}

function sign(username: string): string {
  return createHmac("sha256", sessionSecret()).update(username).digest("hex");
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

export async function getSecurityStatus(): Promise<{ strongSessionSecret: boolean; usingDefaultAuth: boolean }> {
  const config = await readAuthConfig();
  return { strongSessionSecret: hasStrongSessionSecret(), usingDefaultAuth: isUsingDefaultAuth(config) };
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

function loginRateKey(username: string): string {
  return username.trim().toLowerCase() || "anonymous";
}

export async function login(username: string, password: string): Promise<"ok" | "invalid" | "limited"> {
  const key = loginRateKey(username);
  if (await isLoginLimited(key)) return "limited";

  const config = await readAuthConfig();
  if (username !== config.username || !verifyPassword(password, config.passwordHash)) {
    await recordLoginFailure(key);
    return "invalid";
  }

  if (isLegacyPasswordHash(config.passwordHash)) {
    config.passwordHash = hashPassword(password);
    config.updatedAt = new Date().toISOString();
    await writeAuthConfig(config);
  }

  await clearLoginFailures(key);
  const store = await cookies();
  store.set(COOKIE_NAME, `${username}.${sign(username)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  await ensureCsrfToken();
  return "ok";
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete(CSRF_COOKIE_NAME);
}

export async function updateCredentials(currentPassword: string, username: string, newPassword: string): Promise<boolean> {
  const config = await readAuthConfig();
  if (!verifyPassword(currentPassword, config.passwordHash)) return false;
  const nextUsername = username.trim();
  if (!nextUsername || newPassword.length < 10) return false;
  await writeAuthConfig({ username: nextUsername, passwordHash: hashPassword(newPassword), updatedAt: new Date().toISOString() });
  await logout();
  return true;
}

export async function ensureCsrfToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE_NAME)?.value;
  if (existing && existing.length >= 32) return existing;
  const token = randomBytes(32).toString("hex");
  store.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}

export async function getCsrfToken(): Promise<string> {
  return ensureCsrfToken();
}

export async function verifyCsrfToken(token: string | null | undefined): Promise<boolean> {
  const store = await cookies();
  const expected = store.get(CSRF_COOKIE_NAME)?.value;
  if (!token || !expected) return false;
  return safeEqual(token, expected);
}
