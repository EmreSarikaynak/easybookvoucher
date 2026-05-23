import Link from "next/link";
import { cn } from "@/lib/utils";

const SECESTA_URL = "https://secesta.com";
const YEAR = 2026;

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
      <div className="mx-auto max-w-4xl text-center space-y-2">
        {showPlatformNote && (
          <p className={cn("text-xs sm:text-sm leading-relaxed", s.text)}>
            EasyBook Voucher is designed and developed by{" "}
            <span className={cn("font-medium", s.accent)}>Secesta Software Solutions®</span>.
          </p>
        )}

        <p className={cn("text-[11px] sm:text-xs leading-relaxed max-w-2xl mx-auto", s.text)}>
          Professional travel booking, voucher management, and digital operations software for modern agencies.
        </p>

        <div className={cn("flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] sm:text-xs", s.text)}>
          <span>Copyright © {YEAR}. All rights reserved.</span>
          <span className="opacity-40" aria-hidden>
            |
          </span>
          <Link
            href={SECESTA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("font-semibold tracking-tight transition-colors", s.link)}
          >
            Secesta
          </Link>
          <span className="opacity-40" aria-hidden>
            |
          </span>
          <span className="font-medium">Software Solutions®</span>
        </div>

        <p className={cn("text-[10px] opacity-70", s.text)}>
          <Link
            href={SECESTA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("inline-flex items-center gap-1 transition-colors", s.link)}
          >
            secesta.com
            <span aria-hidden>↗</span>
          </Link>
        </p>
      </div>
    </footer>
  );
}
