import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type WaybackStatus = "unchecked" | "available" | "missing" | "submitted" | "failed";
export type WaybackSource = "availability" | "save_page_now";

export type WaybackMetadata = {
  status: WaybackStatus;
  url?: string;
  timestamp?: string;
  checkedAt?: string;
  submittedAt?: string;
  source?: WaybackSource;
  error?: string;
};

type WaybackOptions = {
  fetcher?: typeof fetch;
  waitMs?: number;
};

type AvailabilityResponse = {
  archived_snapshots?: {
    closest?: {
      available?: boolean;
      url?: string;
      timestamp?: string;
      status?: string;
    };
  };
};

function nowIso(): string {
  return new Date().toISOString();
}

function availabilityUrl(url: string): string {
  const endpoint = new URL("https://archive.org/wayback/available");
  endpoint.searchParams.set("url", url);
  return endpoint.toString();
}

function saveUrl(url: string): string {
  return `https://web.archive.org/save/${url}`;
}

export function getProxyUrl(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy;
}

function requestTimeoutSeconds(init: RequestInit): string {
  const signal = init.signal as (AbortSignal & { reason?: unknown }) | null | undefined;
  const reason = signal?.reason;
  return typeof reason === "number" ? String(Math.max(1, Math.ceil(reason / 1000))) : "45";
}

async function curlFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const args = ["-sS", "-L", "--max-time", requestTimeoutSeconds(init), "-w", "\\n__FOLIUM_HTTP_STATUS__:%{http_code}"];
  const method = init.method ?? "GET";
  if (method !== "GET") args.push("-X", method);
  const headers = new Headers(init.headers);
  for (const [key, value] of headers.entries()) args.push("-H", `${key}: ${value}`);
  args.push(url);
  const { stdout } = await execFileAsync("curl", args, { maxBuffer: 8 * 1024 * 1024 });
  const marker = "\n__FOLIUM_HTTP_STATUS__:";
  const index = stdout.lastIndexOf(marker);
  if (index === -1) throw new Error("Wayback curl response did not include HTTP status");
  const body = stdout.slice(0, index);
  const status = Number(stdout.slice(index + marker.length).trim());
  return new Response(body, { status });
}

async function waybackFetch(fetcher: typeof fetch, url: string, init: RequestInit = {}): Promise<Response> {
  if (getProxyUrl() && fetcher === fetch) return curlFetch(url, init);
  return fetcher(url, init);
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkWaybackAvailability(url: string, options: WaybackOptions = {}): Promise<WaybackMetadata> {
  const fetcher = options.fetcher ?? fetch;
  const checkedAt = nowIso();
  try {
    const response = await waybackFetch(fetcher, availabilityUrl(url), {
      signal: AbortSignal.timeout(20_000),
      headers: { accept: "application/json", "user-agent": "Folium/0.1 (+self-hosted visual library)" },
    });
    if (!response.ok) throw new Error(`Wayback availability failed: ${response.status}`);
    const payload = (await response.json()) as AvailabilityResponse;
    const closest = payload.archived_snapshots?.closest;
    if (closest?.available && closest.url) {
      return {
        status: "available",
        url: closest.url,
        timestamp: closest.timestamp,
        checkedAt,
        source: "availability",
      };
    }
    return { status: "missing", checkedAt, source: "availability" };
  } catch (error) {
    return {
      status: "failed",
      checkedAt,
      source: "availability",
      error: error instanceof Error ? error.message : "Unknown Wayback availability error",
    };
  }
}

export async function submitToWayback(url: string, options: WaybackOptions = {}): Promise<WaybackMetadata> {
  const fetcher = options.fetcher ?? fetch;
  const submittedAt = nowIso();
  try {
    const response = await waybackFetch(fetcher, saveUrl(url), {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(45_000),
      headers: { "user-agent": "Folium/0.1 (+self-hosted visual library)" },
    });
    if (!response.ok && response.status !== 429) {
      await sleep(options.waitMs ?? 3_000);
      const availability = await checkWaybackAvailability(url, { fetcher });
      if (availability.status === "available") {
        return { ...availability, source: "save_page_now", submittedAt };
      }
      return {
        status: "submitted",
        checkedAt: availability.checkedAt,
        submittedAt,
        source: "save_page_now",
        error: `Wayback Save Page Now returned ${response.status}. Capture may still be queued by archive.org.`,
      };
    }
    await sleep(options.waitMs ?? 3_000);
    const availability = await checkWaybackAvailability(url, { fetcher });
    if (availability.status === "available") {
      return { ...availability, source: "save_page_now", submittedAt };
    }
    return {
      ...availability,
      status: availability.status === "failed" ? "failed" : "submitted",
      source: "save_page_now",
      submittedAt,
    };
  } catch (error) {
    return {
      status: "failed",
      submittedAt,
      source: "save_page_now",
      error: error instanceof Error ? error.message : "Unknown Wayback submission error",
    };
  }
}
