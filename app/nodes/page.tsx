import { redirect } from "next/navigation";

export default async function NodesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  redirect(query ? `/search?q=${encodeURIComponent(query)}` : "/topics?view=nodes");
}
