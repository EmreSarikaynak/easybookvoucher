import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import twilio from "twilio";

const HARDCODED_ADMIN = "+905366029397";

export async function POST(req: Request) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const data = Object.fromEntries(params.entries());

    const messageSid   = data.MessageSid  || data.SmsSid || "";
    const messageStatus = data.MessageStatus || data.SmsStatus || "";
    const body         = (data.Body || "").trim();
    const from         = data.From || data.SmsSender || "";
    const errorCode    = data.ErrorCode;
    const errorMessage = data.ErrorMessage;

    if (!messageSid) {
      return NextResponse.json({ error: "Missing MessageSid" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // ── 1. Outbound status callback ──────────────────────────────────────
    if (messageStatus && messageStatus !== "received") {
      const updateData: Record<string, string> = {
        status: messageStatus,
        updated_at: new Date().toISOString(),
      };
      if (errorMessage) updateData.error_message = errorMessage;

      await supabase
        .from("whatsapp_logs")
        .update(updateData)
        .eq("message_sid", messageSid);

      return NextResponse.json({ success: true, type: "status_update" });
    }

    // ── 2. Inbound message ───────────────────────────────────────────────
    if (from) {
      // Clean phone: strip "whatsapp:" prefix for display & wa.me link
      const rawPhone = from.replace(/^whatsapp:/i, "");
      const digitsOnly = rawPhone.replace(/[^0-9]/g, "");
      const waLink = `https://wa.me/${digitsOnly}`;

      const displayBody = body || "(Medya / Ses / Boş mesaj)";

      // Save to logs
      await supabase.from("whatsapp_logs").insert({
        message_sid: messageSid,
        phone_number: rawPhone,
        direction: "inbound",
        body: displayBody,
        status: "received",
        voucher_no: null,
      });

      // Forward to admin(s)
      const forwardMsg =
        `📩 *GELEN WHATSAPP MESAJI*\n\n` +
        `📱 Gönderen: ${rawPhone}\n` +
        `💬 Yanıt için tıkla: ${waLink}\n\n` +
        `─────────────────\n` +
        `${displayBody}\n` +
        `─────────────────\n` +
        `Bu mesaj otomatik iletilmiştir.`;

      // Read admin number from settings
      let adminPhoneFromSettings: string | null = null;
      try {
        const { data: settingRow } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "admin_whatsapp_phone")
          .single();
        if (settingRow?.value && typeof settingRow.value === "string") {
          adminPhoneFromSettings = settingRow.value.trim();
        }
      } catch { /* ignore */ }

      // Twilio client
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken  = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER;

      if (accountSid && authToken && twilioFrom) {
        const client = twilio(accountSid, authToken);

        const formatTo = (phone: string) => {
          let digits = phone.replace(/[^0-9]/g, "");
          if (!phone.startsWith("+") && !phone.startsWith("00") && digits.length <= 11) {
            digits = digits.startsWith("0") ? "90" + digits.slice(1) : "90" + digits;
          }
          return `whatsapp:+${digits}`;
        };

        const targets = new Set<string>();
        targets.add(formatTo(HARDCODED_ADMIN));
        if (adminPhoneFromSettings) {
          targets.add(formatTo(adminPhoneFromSettings));
        }
        // Don't forward back to the sender
        const senderFormatted = formatTo(rawPhone);
        targets.delete(senderFormatted);

        for (const to of targets) {
          try {
            const msg = await client.messages.create({
              from: twilioFrom,
              to,
              body: forwardMsg,
            } as Parameters<typeof client.messages.create>[0]);

            // Log the forwarded outbound message
            await supabase.from("whatsapp_logs").insert({
              message_sid: msg.sid,
              phone_number: to.replace("whatsapp:", ""),
              direction: "outbound",
              body: forwardMsg,
              status: msg.status || "queued",
              voucher_no: null,
            });
          } catch (fwdErr) {
            console.error("Inbound forward error:", fwdErr);
          }
        }
      }

      // Empty TwiML response (no auto-reply to sender)
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
