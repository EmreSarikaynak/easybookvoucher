"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, CheckCircle2, XCircle } from "lucide-react";
import {
    requestNotificationPermission,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    hasNotificationPermission,
    isNotificationSupported,
    getPushSubscription,
} from "@/lib/push-notifications";
import { createClient } from "@/lib/supabase";

export function NotificationSettings() {
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            setIsSupported(isNotificationSupported());

            if ("Notification" in window) {
                setPermission(Notification.permission);
            }

            const subscription = await getPushSubscription();
            setIsSubscribed(!!subscription);
        };

        checkStatus();
    }, []);

    const handleEnableNotifications = async () => {
        setLoading(true);
        try {
            // Request permission
            const perm = await requestNotificationPermission();
            setPermission(perm);

            if (perm === "granted") {
                // Subscribe to push
                const subscription = await subscribeToPushNotifications();

                if (subscription) {
                    // Save subscription to database
                    const supabase = createClient();
                    const { data: { user } } = await supabase.auth.getUser();

                    if (user) {
                        await supabase.from("push_subscriptions").upsert({
                            user_id: user.id,
                            subscription: subscription.toJSON(),
                            updated_at: new Date().toISOString(),
                        });
                    }

                    setIsSubscribed(true);
                }
            }
        } catch (error) {
            console.error("Enable notifications error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDisableNotifications = async () => {
        setLoading(true);
        try {
            const success = await unsubscribeFromPushNotifications();

            if (success) {
                // Remove from database
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    await supabase
                        .from("push_subscriptions")
                        .delete()
                        .eq("user_id", user.id);
                }

                setIsSubscribed(false);
            }
        } catch (error) {
            console.error("Disable notifications error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isSupported) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BellOff className="h-5 w-5" />
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
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Push Bildirimleri
                </CardTitle>
                <CardDescription>
                    Önemli güncellemeler için bildirim alın
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Permission status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-sm">Bildirim İzni</p>
                        <p className="text-xs text-gray-600">
                            {permission === "granted" && "İzin verildi"}
                            {permission === "denied" && "İzin reddedildi"}
                            {permission === "default" && "Henüz sorulmadı"}
                        </p>
                    </div>
                    {permission === "granted" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : permission === "denied" ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                    ) : (
                        <Bell className="h-5 w-5 text-gray-400" />
                    )}
                </div>

                {/* Subscription status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-medium text-sm">Bildirim Durumu</p>
                        <p className="text-xs text-gray-600">
                            {isSubscribed ? "Aktif" : "Pasif"}
                        </p>
                    </div>
                    {isSubscribed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                </div>

                {/* Action button */}
                {permission === "denied" ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            Bildirimler tarayıcı ayarlarından engellenmiş. Tarayıcı ayarlarından izin vermeniz gerekiyor.
                        </p>
                    </div>
                ) : (
                    <div>
                        {isSubscribed ? (
                            <Button
                                onClick={handleDisableNotifications}
                                disabled={loading}
                                variant="outline"
                                className="w-full"
                            >
                                <BellOff className="mr-2 h-4 w-4" />
                                Bildirimleri Kapat
                            </Button>
                        ) : (
                            <Button
                                onClick={handleEnableNotifications}
                                disabled={loading}
                                className="w-full bg-teal-600 hover:bg-teal-700"
                            >
                                <Bell className="mr-2 h-4 w-4" />
                                Bildirimleri Aç
                            </Button>
                        )}
                    </div>
                )}

                {/* Info */}
                <div className="text-xs text-gray-600 space-y-1">
                    <p>• Yeni rezervasyon bildirimleri</p>
                    <p>• Ödeme hatırlatmaları</p>
                    <p>• Önemli sistem güncellemeleri</p>
                </div>
            </CardContent>
        </Card>
    );
}
