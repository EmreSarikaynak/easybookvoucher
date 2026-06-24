import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { fetchAgencyTourPriceMap } from "@/lib/tour-catalog-data";
import { normalizeStoredPhone } from "@/lib/phone";
import { parseWhatsappPhoneSetting } from "@/lib/settings-utils";
import { sendWhatsAppViaFetch } from "@/lib/twilio-core";
import { buildAgencyCatalogUrl } from "@/lib/site-url";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PublicBookingPayload {
  agencyCode?: string;
  tourId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
  hotel?: string;
  pickupPlace?: string;
  tourDate?: string;
  paxAdult?: number;
  paxChild?: number;
  paxInfant?: number;
  notes?: string;
  honeypot?: string;
}

const ratelimitMap = new Map<string, { count: number; firstAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ratelimitMap.get(ip);
  if (!entry || now - entry.firstAt > RATE_LIMIT_WINDOW_MS) {
    ratelimitMap.set(ip, { count: 1, firstAt: now });
    return false;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

function nextVoucherNo(prefix: string, existing: Array<{ voucher_no: string }>): string {
  let maxNo = 0;
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escapedPrefix}-?(\\d+)$`, "i");
  for (const v of existing) {
    const m = (v.voucher_no || "").match(regex);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNo) maxNo = n;
    }
  }
  if (prefix.toLowerCase() === "ebook") {
    return `EBook-${maxNo + 1}`;
  }
  return `${prefix}${maxNo + 1}`;
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: "Çok fazla istek. Lütfen biraz sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    const payload = (await request.json()) as PublicBookingPayload;

    if (payload.honeypot && payload.honeypot.trim().length > 0) {
      return NextResponse.json(
        { success: false, error: "Geçersiz istek" },
        { status: 400 }
      );
    }

    const agencyCode = payload.agencyCode?.trim();
    const tourId = payload.tourId?.trim();
    const customerName = payload.customerName?.trim();
    const customerPhone = normalizeStoredPhone(payload.customerPhone ?? null);
    const tourDate = payload.tourDate?.trim();
    const paxAdult = Number(payload.paxAdult ?? 0);
    const paxChild = Number(payload.paxChild ?? 0);
    const paxInfant = Number(payload.paxInfant ?? 0);

    if (!agencyCode || !tourId || !customerName || !customerPhone || !tourDate) {
      return NextResponse.json(
        { success: false, error: "Zorunlu alanlar eksik" },
        { status: 400 }
      );
    }

    if (paxAdult < 1) {
      return NextResponse.json(
        { success: false, error: "En az 1 yetişkin gerekir" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data: agency } = await supabase
      .from("agencies")
      .select("id, agency_code, is_active, public_catalog_enabled, phone")
      .eq("agency_code", agencyCode)
      .maybeSingle();

    if (!agency || !agency.is_active || agency.public_catalog_enabled === false) {
      return NextResponse.json(
        { success: false, error: "Bu acente aktif değil" },
        { status: 404 }
      );
    }

    const { data: tour } = await supabase
      .from("tours")
      .select(
        "id, name, is_active, base_price_adult_eur, base_price_child_eur, base_price_adult_try, base_price_child_try, infant_pricing_enabled, currency"
      )
      .eq("id", tourId)
      .maybeSingle();

    if (!tour || !tour.is_active) {
      return NextResponse.json(
        { success: false, error: "Tur bulunamadı veya aktif değil" },
        { status: 404 }
      );
    }

    const priceMap = await fetchAgencyTourPriceMap(supabase, agency.id, [tour]);
    const priceSet = priceMap.get(tour.id);
    const eurPrice = priceSet?.eur ?? { adult: 0, child: 0, infant: 0 };
    // infant fiyatı yalnızca tur için açıksa (>0) gelir; fetchAgencyTourPriceMap zaten gate'ler.
    const totalPrice =
      paxAdult * eurPrice.adult +
      paxChild * eurPrice.child +
      paxInfant * eurPrice.infant;

    const { data: latest } = await supabase
      .from("vouchers")
      .select("voucher_no")
      .ilike("voucher_no", `${agency.agency_code}%`)
      .order("created_at", { ascending: false })
      .limit(100);

    const voucherNo = nextVoucherNo(agency.agency_code, latest ?? []);

    const { data: inserted, error: insertError } = await supabase
      .from("vouchers")
      .insert({
        voucher_no: voucherNo,
        tour_id: tourId,
        tour_date: tourDate,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: payload.customerEmail?.trim() || null,
        hotel: payload.hotel?.trim() || "",
        room_no: "",
        pax_adult: paxAdult,
        pax_child: paxChild,
        pax_infant: paxInfant,
        pickup_place: payload.pickupPlace?.trim() || payload.hotel?.trim() || "",
        pickup_time: null,
        total_price: totalPrice,
        currency: "EUR",
        deposit_paid: 0,
        notes: payload.notes?.trim() || "",
        sales_person_id: null,
        agency_id: agency.id,
        status: "active",
        source: "public_qr",
      })
      .select("id, voucher_no")
      .single();

    if (insertError || !inserted) {
      console.error("public booking insert error:", insertError);
      return NextResponse.json(
        {
          success: false,
          error: "Rezervasyon kaydedilemedi: " + (insertError?.message ?? "bilinmeyen hata"),
        },
        { status: 500 }
      );
    }

    const { data: settingRow } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "admin_whatsapp_phone")
      .maybeSingle();
    const adminPhoneFromSettings = parseWhatsappPhoneSetting(settingRow?.value);

    const dateTr = (() => {
      try {
        const d = new Date(tourDate);
        return Number.isNaN(d.getTime())
          ? tourDate
          : format(d, "dd MMMM yyyy EEEE", { locale: tr });
      } catch {
        return tourDate;
      }
    })();

    const paxParts: string[] = [];
    if (paxAdult > 0) paxParts.push(`${paxAdult} Yetişkin`);
    if (paxChild > 0) paxParts.push(`${paxChild} Çocuk`);
    if (paxInfant > 0) paxParts.push(`${paxInfant} Bebek`);
    const paxStr = paxParts.join(" + ");

    const adminBody =
      `🌐 *YENİ ONLINE REZERVASYON*\n\n` +
      `🎫 Bilet No: ${inserted.voucher_no}\n` +
      `👤 Misafir: ${customerName}\n` +
      `📱 Telefon: ${customerPhone}\n` +
      `🚢 Tur: ${tour.name}\n` +
      `📅 Tarih: ${dateTr}\n` +
      (payload.hotel?.trim() ? `🏨 Otel: ${payload.hotel.trim()}\n` : "") +
      (payload.pickupPlace?.trim() ? `📍 Alış: ${payload.pickupPlace.trim()}\n` : "") +
      `👥 PAX: ${paxStr}\n` +
      `🏢 Acente Kodu: ${agency.agency_code}\n` +
      `💶 Toplam: €${totalPrice.toFixed(0)}\n\n` +
      `🔗 Müşteri ile iletişim: https://wa.me/${customerPhone.replace(/[^0-9]/g, "")}\n\n` +
      `Lütfen panelden PDF üretip müşteriye gönderin.`;

    const agencyBody =
      `🌐 *YENİ ONLINE REZERVASYON — ACENTE BİLDİRİMİ*\n\n` +
      `Online katalogdan yeni rezervasyon alındı:\n\n` +
      `🎫 Bilet No: ${inserted.voucher_no}\n` +
      `👤 Misafir: ${customerName}\n` +
      `📱 Misafir Tel: ${customerPhone}\n` +
      `🚢 Tur: ${tour.name}\n` +
      `📅 Tarih: ${dateTr}\n` +
      (payload.hotel?.trim() ? `🏨 Otel: ${payload.hotel.trim()}\n` : "") +
      (payload.pickupPlace?.trim() ? `📍 Alış: ${payload.pickupPlace.trim()}\n` : "") +
      `👥 PAX: ${paxStr}\n\n` +
      `Lütfen panelden PDF biletini üretin ve müşteriye gönderin.`;

    const isCustomerTr = customerPhone.startsWith("+90") || customerPhone.startsWith("90");
    const customerBody = isCustomerTr
      ? `Sayın ${customerName},\n\nRezervasyon talebiniz alındı.\n\n` +
        `🎫 Bilet No: ${inserted.voucher_no}\n` +
        `🚢 Tur: ${tour.name}\n` +
        `📅 Tarih: ${dateTr}\n` +
        `👥 Kişi: ${paxStr}\n\n` +
        `Bilet detaylarınız (PDF) en kısa sürede tarafınıza iletilecektir. ` +
        `Sorularınız için bu numaradan WhatsApp üzerinden ulaşabilirsiniz.\n\n` +
        `İyi tatiller dileriz! 🌊`
      : `Dear ${customerName},\n\nYour booking has been received.\n\n` +
        `🎫 Ticket No: ${inserted.voucher_no}\n` +
        `🚢 Tour: ${tour.name}\n` +
        `📅 Date: ${dateTr}\n` +
        `👥 Guests: ${paxStr}\n\n` +
        `Your full ticket (PDF) will be sent shortly. ` +
        `For any questions, please contact us via WhatsApp.\n\n` +
        `Have a wonderful holiday! 🌊`;

    const HARDCODED_EASYBOOK = "+905366029397";
    const targets: Array<{ to: string; body: string }> = [
      { to: HARDCODED_EASYBOOK, body: adminBody },
    ];
    if (
      adminPhoneFromSettings &&
      normalizeStoredPhone(adminPhoneFromSettings) !==
        normalizeStoredPhone(HARDCODED_EASYBOOK)
    ) {
      targets.push({ to: adminPhoneFromSettings, body: adminBody });
    }
    if (agency.phone) {
      targets.push({ to: agency.phone, body: agencyBody });
    }
    targets.push({ to: customerPhone, body: customerBody });

    void Promise.all(
      targets.map((t) =>
        sendWhatsAppViaFetch({
          to: t.to,
          body: t.body,
          voucherNo: inserted.voucher_no,
          includeMedia: false,
        }).catch((err) => {
          console.error("public booking wa send error:", t.to, err);
        })
      )
    );

    return NextResponse.json({
      success: true,
      voucherNo: inserted.voucher_no,
      voucherId: inserted.id,
      catalogUrl: buildAgencyCatalogUrl(agency.agency_code),
    });
  } catch (err: unknown) {
    console.error("public booking unexpected error:", err);
    const msg = err instanceof Error ? err.message : "Beklenmeyen hata";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
