import Link from "next/link";
import { Header } from "@/components/Header";
import { PageIntro } from "@/components/PageIntro";
import { isAuthenticated } from "@/lib/auth";
import { libraryStore } from "@/lib/store/library";

export default async function TopicsPage() {
  const authed = await isAuthenticated();
  const topics = authed ? await libraryStore.listTopics() : await libraryStore.listPublicTopics();
  const topicsWithCounts = await Promise.all(
    topics.map(async (topic) => ({
      topic,
      blockCount: (await (authed ? libraryStore.getBlocksForTopic(topic.slug) : libraryStore.getPublicBlocksForTopic(topic.slug))).length,
    })),
  );

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-5 py-6">
        <PageIntro
          eyebrow="Fine topics"
          title="Topics"
          description="Browse the generated topic layer connecting saved pages by shared themes."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topicsWithCounts.map(({ topic, blockCount }) => (
            <Link key={topic.id} href={`/topics/${topic.slug}`} className="border border-line p-4 hover:bg-soft">
              <p className="text-sm">{topic.name}</p>
              <p className="mt-1 text-xs text-muted">{blockCount} {blockCount === 1 ? "block" : "blocks"}</p>
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">{topic.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
