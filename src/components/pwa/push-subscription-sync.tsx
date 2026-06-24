"use client";

/**
 * Görünmez bileşen — her sayfa yüklenişinde çalışır.
 * İzin "granted" olan kullanıcılar için browser push subscription'ını
 * Supabase'e kaydeder / yeniler.
 * Bu sayede VAPID key değişikliği veya subscription süresi dolmadan
 * kullanıcının ayarlar sayfasına gitmesine gerek kalmaz.
 */

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import {
  isNotificationSupported,
  subscribeToPushNotifications,
} from "@/lib/push-notifications";

const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 saat
const LAST_SYNC_KEY = "push_sub_last_sync";

export function PushSubscriptionSync() {
  useEffect(() => {
    const sync = async () => {
      if (!isNotificationSupported()) return;
      if (Notification.permission !== "granted") return;

      // 24 saatte bir yap — her renderda DB'ye yazmayalım
      const lastSync = Number(localStorage.getItem(LAST_SYNC_KEY) ?? "0");
      if (Date.now() - lastSync < SYNC_INTERVAL_MS) return;

      try {
        const sub = await subscribeToPushNotifications();
        if (!sub) return;

        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from("push_subscriptions").upsert({
          user_id: user.id,
          subscription: sub.toJSON(),
          updated_at: new Date().toISOString(),
        });

        localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
      } catch {
        // Sessizce geç — kullanıcıya hata gösterme
      }
    };

    // Sayfa yüklendikten 5 sn sonra çalıştır (kritik işlemlere engel olmasın)
    const timer = setTimeout(sync, 5000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
