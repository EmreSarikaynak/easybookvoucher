import {
  fetchFooterHelpLinks,
} from "@/lib/help/help-pages-server";
import {
  PlatformFooter,
  type PlatformFooterVariant,
} from "@/components/layout/platform-footer";

interface PlatformFooterDynamicProps {
  variant?: PlatformFooterVariant;
  className?: string;
}

export async function PlatformFooterDynamic({
  variant,
  className,
}: PlatformFooterDynamicProps) {
  const { featured, quick } = await fetchFooterHelpLinks();
  return (
    <PlatformFooter
      variant={variant}
      className={className}
      featuredLinks={featured}
      quickLinks={quick}
    />
  );
}
