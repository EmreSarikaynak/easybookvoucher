import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  FOOTER_HELP_FEATURED,
  FOOTER_HELP_QUICK,
  FOOTER_LEGAL_LINKS,
  HELP_HUB_PATH,
} from "@/lib/help/navigation";

type PlatformFooterVariant = "default" | "compact" | "help" | "login";

interface PlatformFooterProps {
  variant?: PlatformFooterVariant;
  className?: string;
}

const variantStyles: Record<
  PlatformFooterVariant,
  { wrapper: string; heading: string; link: string }
> = {
  default: {
    wrapper: "border-t bg-muted/30",
    heading: "text-gray-900",
    link: "text-muted-foreground hover:text-primary",
  },
  compact: {
    wrapper: "border-t bg-white/80 backdrop-blur-sm",
    heading: "text-gray-900",
    link: "text-muted-foreground hover:text-primary",
  },
  help: {
    wrapper: "border-t bg-white/80",
    heading: "text-gray-900",
    link: "text-muted-foreground hover:text-primary",
  },
  login: {
    wrapper: "border-t border-white/15 bg-black/20 backdrop-blur-sm",
    heading: "text-white",
    link: "text-white/75 hover:text-white",
  },
};

export function PlatformFooter({
  variant = "default",
  className,
}: PlatformFooterProps) {
  const s = variantStyles[variant];

  return (
    <footer
      className={cn(
        "w-full",
        s.wrapper,
        className
      )}
      aria-label="EasyBook platform footer"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className={cn("text-sm font-semibold mb-3", s.heading)}>
              Kullanım Rehberi
            </h3>
            <ul className="space-y-2">
              {FOOTER_HELP_FEATURED.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn("text-sm transition-colors", s.link)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={cn("text-sm font-semibold mb-3", s.heading)}>
              Hızlı bağlantılar
            </h3>
            <ul className="space-y-2">
              {FOOTER_HELP_QUICK.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn("text-sm transition-colors", s.link)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={cn("text-sm font-semibold mb-3", s.heading)}>Yasal</h3>
            <ul className="space-y-2">
              {FOOTER_LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn("text-sm transition-colors", s.link)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className={cn("mt-4 text-xs", variant === "login" ? "text-white/60" : "text-muted-foreground")}>
              <Link
                href={HELP_HUB_PATH}
                className={cn(
                  "font-medium hover:underline",
                  variant === "login" ? "text-white/90" : "text-primary"
                )}
              >
                Yardım merkezi
              </Link>
              {" — "}
              EasyBook Voucher
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
