import Link from "next/link";
import { ArrowLeft, Lightbulb, Shield } from "lucide-react";
import type { HelpArticle } from "@/lib/help/types";
import { cn } from "@/lib/utils";

interface HelpArticleViewProps {
  article: HelpArticle;
  className?: string;
}

export function HelpArticleView({ article, className }: HelpArticleViewProps) {
  return (
    <article className={cn("space-y-8", className)}>
      <header className="space-y-2 border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {article.category}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {article.title}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
          {article.summary}
        </p>
      </header>

      <div className="space-y-8">
        {article.sections.map((section, idx) => (
          <section key={idx} className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900">
                {section.title}
              </h2>
              {section.adminOnly && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                  <Shield className="h-3 w-3" />
                  Admin
                </span>
              )}
            </div>
            <div className="prose prose-sm max-w-none text-gray-700 space-y-2">
              {section.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {section.tips && section.tips.length > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5" />
                  İpucu
                </p>
                <ul className="text-sm text-blue-900/90 space-y-1 list-disc list-inside">
                  {section.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="pt-4 border-t">
        <Link
          href="/help"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Tüm rehber makaleleri
        </Link>
      </div>
    </article>
  );
}
