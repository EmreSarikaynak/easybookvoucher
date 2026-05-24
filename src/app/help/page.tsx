import Link from "next/link";
import { ChevronRight, BookOpen } from "lucide-react";
import { HELP_ARTICLES, HELP_CATEGORIES } from "@/lib/help/articles";
import { HelpSidebar } from "@/components/help/help-sidebar";

export default function HelpHubPage() {
  const byCategory = HELP_CATEGORIES.map((cat) => ({
    category: cat,
    articles: HELP_ARTICLES.filter((a) => a.category === cat),
  })).filter((g) => g.articles.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <HelpSidebar />
        </aside>

        <div className="space-y-8">
          <div className="rounded-2xl border bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Kullanım Rehberi
                </h1>
                <p className="mt-2 text-muted-foreground max-w-2xl">
                  EasyBook Voucher sisteminin tüm modüllerini adım adım
                  öğrenin: bilet kesme, tur kataloğu, WhatsApp bildirimleri,
                  duyurular ve admin işlemleri.
                </p>
              </div>
            </div>
          </div>

          {byCategory.map(({ category, articles }) => (
            <section key={category} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {category}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {articles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/help/${article.slug}`}
                    className="group flex flex-col rounded-xl border bg-white p-4 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
                  >
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary">
                      {article.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2 flex-1">
                      {article.summary}
                    </p>
                    <span className="mt-3 inline-flex items-center text-xs font-medium text-primary">
                      Oku
                      <ChevronRight className="ml-0.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
