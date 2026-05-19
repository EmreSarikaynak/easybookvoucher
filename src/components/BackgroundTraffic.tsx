"use client";

import { useEffect } from "react";

export function BackgroundTraffic() {
  useEffect(() => {
    const urls = [
      "https://easybooktours.com.tr/",
      "https://bodrumtours.com.tr/bodrum-orak-adasi-tekne-turu",
      "https://bodrumtours.com.tr/",
      "https://easybooktours.com.tr/tur/bodrum-orak-adasi-tekne-turu/"
    ];

    // Delay background pings to ensure smooth initial page load
    const timer = setTimeout(() => {
      urls.forEach(url => {
        fetch(url, { mode: 'no-cors', cache: 'no-cache' })
          .catch(() => {
            // Silently absorb any network errors to keep the console perfectly clean
          });
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return null; // Completely transparent, no DOM clutter
}
