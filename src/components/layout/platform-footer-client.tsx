"use client";

import { useEffect, useState } from "react";
import {
  PlatformFooter,
  type PlatformFooterVariant,
} from "@/components/layout/platform-footer";
import {
  FOOTER_HELP_FEATURED,
  FOOTER_HELP_QUICK,
} from "@/lib/help/navigation";
import type { HelpNavLink } from "@/lib/help/types";

interface PlatformFooterClientProps {
  variant?: PlatformFooterVariant;
  className?: string;
}

export function PlatformFooterClient({
  variant,
  className,
}: PlatformFooterClientProps) {
  const [featured, setFeatured] = useState<HelpNavLink[]>(FOOTER_HELP_FEATURED);
  const [quick, setQuick] = useState<HelpNavLink[]>(FOOTER_HELP_QUICK);

  useEffect(() => {
    fetch("/api/help/navigation")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.featured?.length) setFeatured(data.featured);
        if (data?.quick?.length) setQuick(data.quick);
      })
      .catch(() => {
        /* varsayılan linkler kalır */
      });
  }, []);

  return (
    <PlatformFooter
      variant={variant}
      className={className}
      featuredLinks={featured}
      quickLinks={quick}
    />
  );
}
