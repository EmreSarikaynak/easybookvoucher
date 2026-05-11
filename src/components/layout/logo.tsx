"use client";

import { useState, useEffect } from "react";
import { getSetting } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  imgClassName?: string;
}

export function Logo({ className, imgClassName }: LogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSetting("site_logo")
      .then((url) => {
        if (typeof url === "string") setLogoUrl(url);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className={cn("h-8 w-32 animate-pulse bg-muted rounded", className)} />;
  }

  if (logoUrl) {
    return (
      <div className={cn("flex items-center", className)}>
        <img
          src={logoUrl}
          alt="EasyBook"
          className={cn("h-8 w-auto object-contain", imgClassName)}
        />
      </div>
    );
  }

  return <h1 className={cn("text-xl font-bold text-primary", className)}>EasyBook</h1>;
}
