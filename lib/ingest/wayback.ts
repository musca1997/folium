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

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkWaybackAvailability(url: string, options: WaybackOptions = {}): Promise<WaybackMetadata> {
  const fetcher = options.fetcher ?? fetch;
  const checkedAt = nowIso();
  try {
    const response = await fetcher(availabilityUrl(url), {
      signal: AbortSignal.timeout(8_000),
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
    const response = await fetcher(saveUrl(url), {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { "user-agent": "Folium/0.1 (+self-hosted visual library)" },
    });
    if (!response.ok && response.status !== 429) throw new Error(`Wayback Save Page Now failed: ${response.status}`);
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
