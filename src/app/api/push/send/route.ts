import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sendPushNotifications } from "@/lib/push-send";

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

    const result = await sendPushNotifications({
      title,
      body: msgBody,
      url,
      tag,
      targetRole,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ sent: result.sent, failed: result.failed });
  } catch (err) {
    console.error("Push send error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
