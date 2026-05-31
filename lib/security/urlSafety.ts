import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

const blockedHostnames = new Set(["localhost", "localhost.localdomain"]);

function ipv4ToNumber(ip: string): number {
  return ip.split(".").reduce((acc, part) => ((acc << 8) + Number(part)) >>> 0, 0);
}

function inCidr4(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(base) & mask);
}

function isBlockedIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    return [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.168.0.0", 16],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4],
    ].some(([base, bits]) => inCidr4(ip, base as string, bits as number));
  }

  const normalized = ip.toLowerCase();
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

export async function assertSafePublicUrl(input: string): Promise<string> {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Invalid URL"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http and https URLs are allowed");
  const hostname = url.hostname.toLowerCase();
  if (blockedHostnames.has(hostname) || hostname.endsWith(".localhost")) throw new Error("Localhost URLs are not allowed");
  if (isIP(hostname) && isBlockedIp(hostname)) throw new Error("Private, loopback, link-local, and reserved IP URLs are not allowed");

  const addresses = await lookup(hostname, { all: true, verbatim: true }).catch((error) => {
    throw new Error(`Could not resolve URL hostname: ${error instanceof Error ? error.message : "DNS error"}`);
  });
  if (addresses.some((entry) => isBlockedIp(entry.address))) throw new Error("URL resolves to a private, loopback, link-local, or reserved IP");
  return url.toString();
}
