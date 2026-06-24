"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isNotificationSupported,
  getPushSubscription,
} from "@/lib/push-notifications";
import { createClient } from "@/lib/supabase";

async function saveSubscriptionToDB(subscription: PushSubscription) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    subscription: subscription.toJSON(),
    updated_at: new Date().toISOString(),
  });
  return !error;
}

async function removeSubscriptionFromDB() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id);
}

export function NotificationSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  /* İzin "granted" ise: mevcut subscription'ı al ve DB'ye kaydet (yenile).
     Bu, geçersiz/eski VAPID ile kaydedilmiş subscription'ları otomatik düzeltir. */
  const refreshSubscription = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const sub = await subscribeToPushNotifications();
      if (sub) {
        await saveSubscriptionToDB(sub);
        setIsSubscribed(true);
        if (!silent) setStatusMsg("✅ Bildirimler aktif ve yenilendi.");
      } else {
        setIsSubscribed(false);
        if (!silent) setStatusMsg("⚠️ Abonelik oluşturulamadı. VAPID ayarını kontrol edin.");
      }
    } catch (err) {
      console.error("refreshSubscription error:", err);
      if (!silent) setStatusMsg("❌ Yenilenemedi.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!isNotificationSupported()) return;
      setIsSupported(true);
      const perm = Notification.permission;
      setPermission(perm);

      if (perm === "granted") {
        // Sessizce subscription'ı yenile — VAPID düzeltmesinden sonra ilk açılışta çalışır
        const existing = await getPushSubscription();
        if (existing) {
          setIsSubscribed(true);
          // Endpoint'i DB'deki ile senkronize et (arka planda, sessizce)
          await saveSubscriptionToDB(existing);
        } else {
          // Browser subscription yok ama izin var → yeniden oluştur
          await refreshSubscription(true);
        }
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm === "granted") {
        const sub = await subscribeToPushNotifications();
        if (sub) {
          await saveSubscriptionToDB(sub);
          setIsSubscribed(true);
          setStatusMsg("✅ Bildirimler açıldı!");
        } else {
          setStatusMsg("⚠️ Abonelik oluşturulamadı.");
        }
      } else if (perm === "denied") {
        setStatusMsg("❌ İzin reddedildi. Tarayıcı ayarlarından açın.");
      }
    } catch (err) {
      console.error("Enable error:", err);
      setStatusMsg("❌ Hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      await unsubscribeFromPushNotifications();
      await removeSubscriptionFromDB();
      setIsSubscribed(false);
      setStatusMsg("Bildirimler kapatıldı.");
    } catch (err) {
      console.error("Disable error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellOff className="h-4 w-4" />
            Bildirimler Desteklenmiyor
          </CardTitle>
          <CardDescription>
            Tarayıcınız push notification desteklemiyor
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Push Bildirimleri
        </CardTitle>
        <CardDescription>
          Duyurular ve önemli güncellemeler için anlık bildirim alın
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Durum satırları */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium text-xs">Bildirim İzni</p>
              <p className="text-xs text-muted-foreground">
                {permission === "granted"
                  ? "Verildi"
                  : permission === "denied"
                  ? "Reddedildi"
                  : "Sorulmadı"}
              </p>
            </div>
            {permission === "granted" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : permission === "denied" ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Bell className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium text-xs">Abonelik</p>
              <p className="text-xs text-muted-foreground">
                {isSubscribed ? "Aktif" : "Pasif"}
              </p>
            </div>
            {isSubscribed ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Aksiyon butonları */}
        {permission === "denied" ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
            Bildirimler tarayıcı tarafından engellenmiş. Tarayıcı ayarlarından
            bu site için bildirimlere izin verin.
          </div>
        ) : isSubscribed ? (
          <div className="flex gap-2">
            <Button
              onClick={() => refreshSubscription(false)}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {loading ? "Yenileniyor..." : "Aboneliği Yenile"}
            </Button>
            <Button
              onClick={handleDisable}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex-1 text-destructive hover:text-destructive"
            >
              <BellOff className="mr-1.5 h-3.5 w-3.5" />
              Kapat
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleEnable}
            disabled={loading}
            className="w-full"
          >
            <Bell className="mr-2 h-4 w-4" />
            {loading ? "Açılıyor..." : "Bildirimleri Aç"}
          </Button>
        )}

        {statusMsg && (
          <p className="text-xs text-muted-foreground">{statusMsg}</p>
        )}

        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>• Yeni duyurular ve sistem bildirimleri</p>
          <p>• Uygulamayı kapatsan bile gelir (PWA kuruluysa)</p>
        </div>
      </CardContent>
    </Card>
  );
}
