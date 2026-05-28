import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { normalizePhoneDigits } from "@/lib/phone";
import twilio from "twilio";

const HARDCODED_ADMIN = "+905366029397";

const ROLE_LABEL_TR: Record<string, string> = {
  super_admin: "süper admin",
  admin: "admin",
  sales: "satıcı",
  agency_admin: "acente yöneticisi",
  agency: "acente",
  customer: "müşteri",
};

type SenderMatch = {
  /** Kısa görünür ad (örn. "Ali Veli" veya "Bodrum Tours") */
  name: string;
  /** Eklenecek rol etiketi ("sales", "agency", "customer", ...) */
  role: string;
  /** Profil/acente için ek detay (örn. acente adı veya kodu) */
  extra?: string;
};

type ActiveVoucher = {
  voucher_no: string;
  tour_date: string;
  customer_name: string;
  hotel: string | null;
  pickup_place: string | null;
  pickup_time: string | null;
  pdf_url: string | null;
  status: string;
  tour: { name: string } | null;
  agency: { name: string | null; agency_code: string | null } | null;
};

function formatPickupTime(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function formatTourDateTr(value: string): string {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      weekday: "long",
    });
  } catch {
    return value;
  }
}

function formatVoucherBlock(v: ActiveVoucher, index: number): string {
  const tourName = v.tour?.name || "—";
  const dateLabel = formatTourDateTr(v.tour_date);
  const pickupLabel = formatPickupTime(v.pickup_time);
  const agencyName = v.agency?.name || "—";
  const agencyCode = v.agency?.agency_code || "—";

  const lines: string[] = [];
  lines.push(`${index}) ${v.voucher_no} — ${v.customer_name}`);
  lines.push(`   🚢 ${tourName}`);
  lines.push(`   📅 ${dateLabel}`);
  if (v.hotel) lines.push(`   🏨 Otel: ${v.hotel}`);
  if (v.pickup_place || pickupLabel) {
    const parts: string[] = [];
    if (v.pickup_place) parts.push(`📍 ${v.pickup_place}`);
    if (pickupLabel) parts.push(`⏰ ${pickupLabel}`);
    lines.push(`   ${parts.join(" · ")}`);
  }
  lines.push(`   🏢 Acente: ${agencyCode} / ${agencyName}`);
  if (v.pdf_url) lines.push(`   📄 PDF: ${v.pdf_url}`);
  return lines.join("\n");
}

export async function POST(req: Request) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const data = Object.fromEntries(params.entries());

    const messageSid    = data.MessageSid  || data.SmsSid || "";
    const messageStatus = data.MessageStatus || data.SmsStatus || "";
    const body          = (data.Body || "").trim();
    const from          = data.From || data.SmsSender || "";
    const errorCode     = data.ErrorCode;
    const errorMessage  = data.ErrorMessage;

    if (!messageSid) {
      return NextResponse.json({ error: "Missing MessageSid" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    if (messageStatus && messageStatus !== "received") {
      const updateData: Record<string, string> = {
        status: messageStatus,
        updated_at: new Date().toISOString(),
      };
      const errDetail = [errorMessage, errorCode ? `kod:${errorCode}` : ""]
        .filter(Boolean)
        .join(" ");
      if (errDetail) updateData.error_message = errDetail;

      await supabase
        .from("whatsapp_logs")
        .update(updateData)
        .eq("message_sid", messageSid);

      return NextResponse.json({ success: true, type: "status_update" });
    }

    if (from) {
      const rawPhone = from.replace(/^whatsapp:/i, "");
      const digits = normalizePhoneDigits(rawPhone);
      const last10 = digits.slice(-10);
      const waLink = digits ? `https://wa.me/${digits}` : "";
      const displayNumber = digits ? `+${digits}` : rawPhone;
      const displayBody = body || "(Medya / Ses / Boş mesaj)";

      await supabase.from("whatsapp_logs").insert({
        message_sid: messageSid,
        phone_number: rawPhone,
        direction: "inbound",
        body: displayBody,
        status: "received",
        voucher_no: null,
      });

      let sender: SenderMatch | null = null;
      let activeVouchers: ActiveVoucher[] = [];

      if (last10) {
        try {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select(
              "full_name, role, agency_id, agency:agencies(name, agency_code)"
            )
            .ilike("phone", `%${last10}`)
            .limit(1)
            .maybeSingle();
          if (profileRow) {
            const agencyJoin = Array.isArray(profileRow.agency)
              ? profileRow.agency[0]
              : profileRow.agency;
            const agencyExtras: string[] = [];
            if (agencyJoin?.agency_code) agencyExtras.push(String(agencyJoin.agency_code));
            if (agencyJoin?.name) agencyExtras.push(String(agencyJoin.name));
            sender = {
              name: profileRow.full_name || "Kayıtlı kullanıcı",
              role: String(profileRow.role || "unknown"),
              extra: agencyExtras.join(" / ") || undefined,
            };
          }
        } catch (err) {
          console.error("profiles lookup error:", err);
        }

        if (!sender) {
          try {
            const { data: agencyRow } = await supabase
              .from("agencies")
              .select("name, agency_code")
              .ilike("phone", `%${last10}`)
              .limit(1)
              .maybeSingle();
            if (agencyRow) {
              sender = {
                name: agencyRow.name || "Acente",
                role: "agency",
                extra: agencyRow.agency_code
                  ? `kod ${agencyRow.agency_code}`
                  : undefined,
              };
            }
          } catch (err) {
            console.error("agencies lookup error:", err);
          }
        }

        if (!sender) {
          try {
            const todayIso = new Date().toISOString().slice(0, 10);
            const { data: rows } = await supabase
              .from("vouchers")
              .select(
                "voucher_no, tour_date, customer_name, hotel, pickup_place, pickup_time, pdf_url, status, tour:tours(name), agency:agencies(name, agency_code)"
              )
              .ilike("customer_phone", `%${last10}`)
              .eq("status", "active")
              .gte("tour_date", todayIso)
              .order("tour_date", { ascending: true })
              .limit(3);
            const normalised = (rows ?? []).map((r) => ({
              ...r,
              tour: Array.isArray(r.tour) ? r.tour[0] ?? null : r.tour,
              agency: Array.isArray(r.agency) ? r.agency[0] ?? null : r.agency,
            })) as ActiveVoucher[];
            activeVouchers = normalised;
            if (normalised.length > 0) {
              sender = {
                name: normalised[0].customer_name || "Misafir",
                role: "customer",
              };
            }
          } catch (err) {
            console.error("vouchers lookup error:", err);
          }
        }
      }

      const senderRoleLabel = sender
        ? ROLE_LABEL_TR[sender.role] || sender.role
        : null;
      const senderLine = sender
        ? `👤 Gönderen: ${sender.name}${senderRoleLabel ? ` (${senderRoleLabel}${sender.extra ? ` · ${sender.extra}` : ""})` : ""}`
        : `👤 Gönderen: Bilinmeyen numara`;

      const voucherBlock =
        activeVouchers.length > 0
          ? `\n🎫 *AKTİF BİLET${activeVouchers.length > 1 ? "LER" : ""}:*\n─────────────\n${activeVouchers
              .map((v, i) => formatVoucherBlock(v, i + 1))
              .join("\n\n")}\n─────────────\n`
          : "";

      const forwardMsg =
        `📩 *GELEN WHATSAPP MESAJI*\n\n` +
        `${senderLine}\n` +
        `📱 Numara: ${displayNumber}\n` +
        (waLink ? `💬 Yanıtla: ${waLink}\n` : "") +
        voucherBlock +
        `\n💬 Mesaj:\n"${displayBody}"\n\n` +
        `Bu mesaj otomatik iletilmiştir.`;

      let adminPhoneFromSettings: string | null = null;
      try {
        const { parseWhatsappPhoneSetting } = await import("@/lib/settings-utils");
        const { data: settingRow } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "admin_whatsapp_phone")
          .maybeSingle();
        adminPhoneFromSettings = parseWhatsappPhoneSetting(settingRow?.value);
      } catch { /* ignore */ }

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken  = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER;

      if (accountSid && authToken && twilioFrom) {
        const client = twilio(accountSid, authToken);

        const formatTo = (phone: string) => {
          let d = phone.replace(/[^0-9]/g, "");
          if (!phone.startsWith("+") && !phone.startsWith("00") && d.length <= 11) {
            d = d.startsWith("0") ? "90" + d.slice(1) : "90" + d;
          }
          return `whatsapp:+${d}`;
        };

        const targets = new Set<string>();
        targets.add(formatTo(HARDCODED_ADMIN));
        if (adminPhoneFromSettings) {
          targets.add(formatTo(adminPhoneFromSettings));
        }
        const senderFormatted = formatTo(rawPhone);
        targets.delete(senderFormatted);

        for (const to of targets) {
          try {
            const msg = await client.messages.create({
              from: twilioFrom,
              to,
              body: forwardMsg,
            } as Parameters<typeof client.messages.create>[0]);

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
