import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { syncTcmbRatesToDatabase } from "@/lib/exchange-rates";

/**
 * Günlük TCMB kur senkronu — harici scheduler tarafından çağrılır.
 * Authorization: Bearer CRON_SECRET
 *
 * Deploy hedefi Cloudflare Workers olduğu için Vercel cron çalışmaz.
 * GitHub Actions ile günlük çalışıyor:
 *   .github/workflows/sync-exchange-rates.yml — 21:00 UTC (= 00:00 Europe/Istanbul)
 *
 * Manuel tetik için: GitHub → Actions → "Sync TCMB Exchange Rates" →
 * "Run workflow", veya /exchange-rates sayfasından admin senkron butonu.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET tanımlı değil" },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    const result = await syncTcmbRatesToDatabase(supabase);

    if (!result.success) {
      return NextResponse.json(result, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("cron sync-exchange-rates:", e);
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Senkron hatası",
      },
      { status: 500 }
    );
  }
}
