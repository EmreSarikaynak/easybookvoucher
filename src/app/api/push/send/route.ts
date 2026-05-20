import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  sendWebPush,
  type PushNotificationPayload,
  type PushSubscriptionData,
} from "@/lib/web-push-crypto";

export const runtime = "edge";

interface SendPushBody {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  targetRole?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      (profile.role !== "super_admin" && profile.role !== "admin")
    ) {
      return NextResponse.json(
        { error: "Bu işlem için admin yetkisi gereklidir" },
        { status: 403 }
      );
    }

    const body: SendPushBody = await req.json();
    const { title, body: msgBody, url, tag, targetRole } = body;

    if (!title || !msgBody) {
      return NextResponse.json(
        { error: "Başlık ve mesaj gereklidir" },
        { status: 400 }
      );
    }

    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidSubject =
      process.env.VAPID_SUBJECT || "mailto:admin@easybooktours.com";

    if (!vapidPrivateKey || !vapidPublicKey) {
      return NextResponse.json(
        { error: "VAPID anahtarları yapılandırılmamış" },
        { status: 500 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Fetch push subscriptions — optionally filtered by role
    let subscriptionsQuery = serviceClient
      .from("push_subscriptions")
      .select("user_id, subscription");

    if (targetRole) {
      const { data: targetUsers } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("role", targetRole);

      const ids = (targetUsers ?? []).map((u: { id: string }) => u.id);
      if (ids.length === 0) {
        return NextResponse.json({ sent: 0, failed: 0 });
      }
      subscriptionsQuery = subscriptionsQuery.in("user_id", ids);
    }

    const { data: subscriptions, error: fetchError } =
      await subscriptionsQuery;

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0 });
    }

    const payload: PushNotificationPayload = {
      title,
      body: msgBody,
      url: url || "/dashboard",
      tag: tag || "admin-push",
    };

    let sent = 0;
    let failed = 0;
    const expiredIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (row: { user_id: string; subscription: PushSubscriptionData }) => {
        const sub = row.subscription as PushSubscriptionData;
        if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
          failed++;
          return;
        }

        const result = await sendWebPush(
          sub,
          payload,
          vapidPrivateKey,
          vapidPublicKey,
          vapidSubject
        );

        if (result.success) {
          sent++;
        } else {
          failed++;
          // 410 Gone = subscription is no longer valid
          if (result.statusCode === 410) {
            expiredIds.push(row.user_id);
          }
        }
      })
    );

    // Remove expired subscriptions
    if (expiredIds.length > 0) {
      await serviceClient
        .from("push_subscriptions")
        .delete()
        .in("user_id", expiredIds);
    }

    return NextResponse.json({ sent, failed });
  } catch (err) {
    console.error("Push send error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
