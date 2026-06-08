import { createServiceRoleClient } from "@/lib/supabase-server";
import {
  sendWebPush,
  type PushNotificationPayload,
  type PushSubscriptionData,
} from "@/lib/web-push-crypto";

export interface SendPushOptions {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  targetRole?: string | null;
}

export interface SendPushResult {
  sent: number;
  failed: number;
  error?: string;
}

export async function sendPushNotifications(
  opts: SendPushOptions
): Promise<SendPushResult> {
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidSubject =
    process.env.VAPID_SUBJECT || "mailto:admin@easybooktours.com";

  if (!vapidPrivateKey || !vapidPublicKey) {
    return { sent: 0, failed: 0, error: "VAPID anahtarları yapılandırılmamış" };
  }

  const serviceClient = createServiceRoleClient();

  let subscriptionsQuery = serviceClient
    .from("push_subscriptions")
    .select("user_id, subscription");

  if (opts.targetRole) {
    const { data: targetUsers } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("role", opts.targetRole);

    const ids = (targetUsers ?? []).map((u: { id: string }) => u.id);
    if (ids.length === 0) {
      return { sent: 0, failed: 0 };
    }
    subscriptionsQuery = subscriptionsQuery.in("user_id", ids);
  }

  const { data: subscriptions, error: fetchError } = await subscriptionsQuery;
  if (fetchError) {
    return { sent: 0, failed: 0, error: fetchError.message };
  }
  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payload: PushNotificationPayload = {
    title: opts.title,
    body: opts.body,
    url: opts.url || "/dashboard",
    tag: opts.tag || "admin-push",
  };

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    subscriptions.map(
      async (row: { user_id: string; subscription: PushSubscriptionData }) => {
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
          if (result.statusCode === 410) {
            expiredIds.push(row.user_id);
          }
        }
      }
    )
  );

  if (expiredIds.length > 0) {
    await serviceClient
      .from("push_subscriptions")
      .delete()
      .in("user_id", expiredIds);
  }

  return { sent, failed };
}
