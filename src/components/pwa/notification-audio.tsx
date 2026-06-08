"use client";

import { useEffect, useRef } from "react";

/**
 * Foreground'da açık sekmelerde push bildirimi geldiğinde SW'den gelen
 * postMessage sinyalini yakalar ve `/sounds/notification.mp3` (yoksa
 * `/sounds/notification.wav`) çalar.
 *
 * Browser autoplay politikası: ses ancak sayfada bir kullanıcı etkileşimi
 * (tıklama, dokunma vb.) gerçekleştikten sonra çalabilir. Login sonrası
 * dashboard'da bu koşul tipik olarak çoktan sağlanmış olur.
 *
 * iOS: PWA install + permission verilmiş olsa bile özel ses çalmaz —
 * iOS bildirim API'si özel ses kabul etmiyor; sistem sesi kullanılır.
 */
export function NotificationAudio() {
  const lastPlayedRef = useRef<number>(0);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;

    const playSound = async () => {
      // Çok hızlı arka arkaya gelen bildirimlerde sesi spamlamayalım (250ms throttle).
      const now = Date.now();
      if (now - lastPlayedRef.current < 250) return;
      lastPlayedRef.current = now;

      const paths = ["/sounds/notification.mp3", "/sounds/notification.wav"];
      for (const src of paths) {
        try {
          const audio = new Audio(src);
          audio.volume = 0.85;
          await audio.play();
          return; // ilk başarılı path'te dur
        } catch {
          // sonraki path'i dene
        }
      }
    };

    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string } | undefined;
      if (data?.type !== "play-notification-sound") return;
      void playSound();
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
    };
  }, []);

  return null;
}
