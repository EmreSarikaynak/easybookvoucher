import Link from "next/link";
import { cn } from "@/lib/utils";
import type { HelpArticle } from "@/lib/help/types";

interface HelpSidebarProps {
  articles: HelpArticle[];
  currentSlug?: string;
  className?: string;
}

export function HelpSidebar({
  articles,
  currentSlug,
  className,
}: HelpSidebarProps) {
  return (
    <nav
      className={cn(
        "rounded-xl border bg-white p-4 space-y-4 text-sm",
        className
      )}
      aria-label="Rehber içindekiler"
    >
      <p className="font-semibold text-gray-900">Makaleler</p>
      <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/help/${a.slug}`}
              className={cn(
                "block rounded-md px-2 py-1.5 transition-colors hover:bg-muted",
                currentSlug === a.slug &&
                  "bg-primary/10 text-primary font-medium"
              )}
            >
              {a.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
