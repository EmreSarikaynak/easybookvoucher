"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  isNotificationSupported,
} from "@/lib/push-notifications";
import { createClient } from "@/lib/supabase";

const DISMISS_KEY = "notif_prompt_dismissed_until";

export function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isNotificationSupported()) return;
    if (Notification.permission !== "default") return;

    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    const t = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const perm = await requestNotificationPermission();
      if (perm === "granted") {
        const subscription = await subscribeToPushNotifications();
        if (subscription) {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("push_subscriptions").upsert({
              user_id: user.id,
              subscription: subscription.toJSON(),
              updated_at: new Date().toISOString(),
            });
          }
        }
        setShow(false);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80 animate-slide-up">
      <div className="rounded-xl border bg-white shadow-lg p-4 flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Bildirimleri Aç</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Yeni biletler ve güncellemeler için anında bildirim alın.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleEnable}
              disabled={loading}
            >
              {loading ? "..." : "Aç"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={handleDismiss}
            >
              Şimdi Değil
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 hover:bg-muted"
          aria-label="Kapat"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
