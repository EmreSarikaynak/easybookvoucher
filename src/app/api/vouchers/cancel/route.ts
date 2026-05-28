import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { parseWhatsappPhonesSetting } from "@/lib/settings-utils";
import { sendVoucherCancellationNotificationsFetch } from "@/lib/twilio-core";
import { formatDbError } from "@/lib/error-messages";

/**
 * Bilet iptali + WhatsApp bildirimleri.
 *
 * - Yetki: agency_admin / sales sadece kendi acentesine ait aktif bileti
 *   iptal edebilir; admin / super_admin tüm aktif biletleri iptal edebilir.
 * - İptal sonrası EasyBook + ayarlardaki ek adminler + acente + müşteriye
 *   WhatsApp gönderilir. Bir veya birden çok alıcıya gönderim başarısız
 *   olsa bile (örn. 24h penceresi) iptal başarılı sayılır; istemciye
 *   gönderim özeti döner.
 *
 * Server action yerine REST endpoint kullanıyoruz çünkü Cloudflare Pages
 * deploy'lar arasında server action chunk ID'leri "Failed to fetch" üretebiliyor.
 * Bu endpoint SW'de `NetworkOnly` olarak işaretli, hash sorunu yaşamıyor.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

    const payload = (await request.json()) as { voucherId?: string };
    const voucherId = payload?.voucherId?.trim();
    if (!voucherId) {
      return NextResponse.json(
        { success: false, error: "voucherId zorunludur" },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, agency_id, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profil bulunamadı" },
        { status: 403 }
      );
    }

    // Bilet + acente + tur + müşteri bilgilerini tek seferde al.
    // Not: select string uzun olunca Supabase TS inference "GenericStringError"
    // döndürüyor. Bu yüzden "*" + iki ilişki ile aldık; tip cast'i ile devam.
    const { data: voucher, error: vErr } = await supabase
      .from("vouchers")
      .select(
        "*, tour:tours(name), agency:agencies(id, name, agency_code, phone)"
      )
      .eq("id", voucherId)
      .single();

    if (vErr || !voucher) {
      return NextResponse.json(
        { success: false, error: "Bilet bulunamadı" },
        { status: 404 }
      );
    }

    if (voucher.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Sadece aktif biletler iptal edilebilir" },
        { status: 400 }
      );
    }

    const isAdmin =
      profile.role === "super_admin" || profile.role === "admin";
    if (!isAdmin && profile.agency_id !== voucher.agency_id) {
      return NextResponse.json(
        { success: false, error: "Bu bileti iptal etme yetkiniz yok" },
        { status: 403 }
      );
    }

    // 1) Statü güncellemesi — service role, RLS aşılır
    const serviceSupabase = createServiceRoleClient();
    const { error: updateErr } = await serviceSupabase
      .from("vouchers")
      .update({ status: "cancelled" })
      .eq("id", voucherId);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: formatDbError(updateErr) },
        { status: 500 }
      );
    }

    // 2) Admin numaralarını ayarlardan oku
    const { data: settingRow } = await serviceSupabase
      .from("settings")
      .select("value")
      .eq("key", "admin_whatsapp_phone")
      .maybeSingle();
    const adminPhonesFromSettings = parseWhatsappPhonesSetting(
      settingRow?.value
    );

    const agency =
      voucher.agency && !Array.isArray(voucher.agency)
        ? (voucher.agency as {
            id: string;
            name: string | null;
            agency_code: string | null;
            phone: string | null;
          })
        : null;

    const tour =
      voucher.tour && !Array.isArray(voucher.tour)
        ? (voucher.tour as { name: string | null })
        : null;

    // 3) WhatsApp bildirimleri — başarısızlık iptal akışını bloklamaz
    let notificationsResult:
      | Awaited<ReturnType<typeof sendVoucherCancellationNotificationsFetch>>
      | null = null;
    let notificationsError: string | undefined;
    try {
      notificationsResult = await sendVoucherCancellationNotificationsFetch({
        agencyPhone: agency?.phone ?? null,
        adminPhonesFromSettings,
        voucher: {
          voucherNo: voucher.voucher_no,
          tourName: tour?.name || "Tur",
          tourDate: voucher.tour_date,
          customerName: voucher.customer_name,
          customerPhone: voucher.customer_phone,
          hotel: voucher.hotel,
          pickupTime: voucher.pickup_time,
          pickupPlace: voucher.pickup_place,
          paxAdult: voucher.pax_adult,
          paxChild: voucher.pax_child,
          paxInfant: voucher.pax_infant,
          totalPrice: voucher.total_price,
          depositPaid: voucher.deposit_paid,
          currency: voucher.currency,
          agencyName: agency?.name ?? null,
          agencyCode: agency?.agency_code ?? null,
          cancelledByName: profile.full_name ?? null,
        },
      });
    } catch (notifyErr) {
      console.error("İptal bildirimi gönderilemedi:", notifyErr);
      notificationsError =
        notifyErr instanceof Error ? notifyErr.message : String(notifyErr);
    }

    revalidatePath(`/vouchers/${voucherId}`);
    revalidatePath("/vouchers");

    return NextResponse.json({
      success: true,
      sent: notificationsResult?.sent ?? 0,
      failed: notificationsResult?.failed ?? 0,
      results: notificationsResult?.results ?? [],
      notificationsError:
        notificationsError ?? notificationsResult?.error ?? undefined,
    });
  } catch (err: unknown) {
    console.error("cancel-voucher API error:", err);
    const message =
      err instanceof Error ? err.message : "Beklenmeyen sunucu hatası";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
