import { redirect } from "next/navigation";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  redirect(query ? `/nodes?q=${encodeURIComponent(query)}` : "/nodes");
}
