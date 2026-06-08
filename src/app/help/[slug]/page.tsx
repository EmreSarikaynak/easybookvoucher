import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { HelpArticleView } from "@/components/help/help-article";
import { HelpSidebar } from "@/components/help/help-sidebar";
import {
  fetchPublishedHelpPageBySlug,
  fetchPublishedHelpPages,
  fetchPublishedHelpSlugs,
} from "@/lib/help/help-pages-server";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const slugs = await fetchPublishedHelpSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchPublishedHelpPageBySlug(slug);
  if (!article) return { title: "Rehber bulunamadı" };
  return {
    title: `${article.title} — Kullanım Rehberi`,
    description: article.summary,
  };
}

export default async function HelpArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const [article, articles] = await Promise.all([
    fetchPublishedHelpPageBySlug(slug),
    fetchPublishedHelpPages(),
  ]);
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <HelpSidebar currentSlug={slug} articles={articles} />
        </aside>
        <div className="rounded-2xl border bg-white p-6 sm:p-8 shadow-sm">
          <HelpArticleView article={article} />
        </div>
      </div>
    </div>
  );
}
