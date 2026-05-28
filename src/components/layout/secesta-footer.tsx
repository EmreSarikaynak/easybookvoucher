import Link from "next/link";
import { cn } from "@/lib/utils";

const SECESTA_URL = "https://secesta.com";
const COMPANY = "Secesta Software Solutions";
const FOUNDED_YEAR = 2020;
const CURRENT_YEAR = new Date().getFullYear();
const COPYRIGHT_YEARS =
  CURRENT_YEAR > FOUNDED_YEAR ? `${FOUNDED_YEAR}–${CURRENT_YEAR}` : `${CURRENT_YEAR}`;

type SecestaFooterVariant = "default" | "compact" | "login" | "minimal";

interface SecestaFooterProps {
  variant?: SecestaFooterVariant;
  className?: string;
  /** Show a short EasyBook platform credit. */
  showPlatformNote?: boolean;
}

const variantStyles: Record<
  SecestaFooterVariant,
  { wrapper: string; text: string; link: string; accent: string }
> = {
  default: {
    wrapper: "border-t bg-muted/30",
    text: "text-muted-foreground",
    link: "text-foreground/80 hover:text-primary",
    accent: "text-primary/90",
  },
  compact: {
    wrapper: "border-t border-border/60",
    text: "text-muted-foreground",
    link: "text-muted-foreground hover:text-primary",
    accent: "text-primary/80",
  },
  login: {
    wrapper: "border-t border-white/10",
    text: "text-white/70",
    link: "text-white/90 hover:text-white underline-offset-4 hover:underline",
    accent: "text-white/85",
  },
  minimal: {
    wrapper: "",
    text: "text-muted-foreground",
    link: "text-foreground/70 hover:text-primary",
    accent: "text-primary/80",
  },
};

export function SecestaFooter({
  variant = "default",
  className,
  showPlatformNote = true,
}: SecestaFooterProps) {
  const s = variantStyles[variant];

  return (
    <footer
      className={cn(
        "w-full py-5 px-4 sm:py-6",
        s.wrapper,
        className
      )}
      aria-label="Secesta software credit"
    >
      <div className="mx-auto max-w-4xl text-center space-y-2.5">
        {showPlatformNote && (
          <p className={cn("text-xs sm:text-sm leading-relaxed", s.text)}>
            EasyBook Voucher is designed and developed by{" "}
            <Link
              href={SECESTA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("font-semibold tracking-tight transition-colors", s.link)}
            >
              {COMPANY}
            </Link>
            <span aria-hidden>®</span>.
          </p>
        )}

        <p className={cn("text-[11px] sm:text-xs leading-relaxed max-w-2xl mx-auto", s.text)}>
          Professional travel booking, voucher management, and digital operations software for modern agencies.
        </p>

        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] sm:text-xs",
            s.text
          )}
        >
          <span>
            <span aria-hidden>© </span>
            <span className="sr-only">Copyright </span>
            {COPYRIGHT_YEARS}{" "}
            <span className={cn("font-medium", s.accent)}>{COMPANY}</span>
            <span aria-hidden>®</span>. All rights reserved.
          </span>
        </div>

        <p className={cn("text-[10px] sm:text-[11px] opacity-70", s.text)}>
          <Link
            href={SECESTA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("inline-flex items-center gap-1 transition-colors", s.link)}
            aria-label={`Visit ${COMPANY} website`}
          >
            secesta.com
            <span aria-hidden>↗</span>
          </Link>
        </p>
      </div>
    </footer>
  );
}
