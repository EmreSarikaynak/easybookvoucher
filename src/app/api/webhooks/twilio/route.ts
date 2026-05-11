import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import twilio from "twilio";

export async function POST(req: Request) {
  try {
    // Twilio data format in webhooks is application/x-www-form-urlencoded
    const text = await req.text();
    const params = new URLSearchParams(text);
    const data = Object.fromEntries(params.entries());

    // Twilio gönderim durum (status) callbackleri veya gelen mesaj (inbound)
    const messageSid = data.MessageSid;
    const messageStatus = data.MessageStatus;
    const body = data.Body;
    const from = data.From;
    const errorCode = data.ErrorCode;
    const errorMessage = data.ErrorMessage;

    if (!messageSid) {
      return NextResponse.json({ error: "Missing MessageSid" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // 1. Durum güncellemesi (Outbound update)
    if (messageStatus) {
      const updateData: any = {
        status: messageStatus,
        updated_at: new Date().toISOString(),
      };
      
      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      await supabase
        .from("whatsapp_logs")
        .update(updateData)
        .eq("message_sid", messageSid);
        
      return NextResponse.json({ success: true, type: "status_update" });
    }

    // 2. Yeni gelen mesaj (Inbound)
    // Twilio'dan gelen webhook "SmsStatus=received" veya body içerir.
    if (body && from) {
      await supabase.from("whatsapp_logs").insert({
        message_sid: messageSid,
        phone_number: from,
        direction: "inbound",
        body: body,
        status: "received",
      });

      // Twilio'ya TwiML cevabı dönebiliriz ama şimdilik sadece boş 200 dönmek yeterli
      const twiml = new twilio.twiml.MessagingResponse();
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    return NextResponse.json({ success: true, message: "Ignored" });
  } catch (error) {
    console.error("Twilio Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
