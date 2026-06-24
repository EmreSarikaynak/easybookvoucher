import { NextResponse } from "next/server";
import { getCurrentUser, canManageTours } from "@/lib/auth-helpers";
import { translateTourBundle, type TourBundle } from "@/lib/deepl";

export const runtime = "nodejs";

interface ReqBody {
  source?: string; // tr | en | ru | pl
  targets: string[]; // ["en", "ru", "pl"]
  bundle: TourBundle;
}

export async function POST(request: Request) {
  const profile = await getCurrentUser();
  if (!canManageTours(profile)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  if (!process.env.DEEPL_API_KEY) {
    return NextResponse.json(
      { error: "DEEPL_API_KEY .env'de tanımlı değil" },
      { status: 500 }
    );
  }

  let body: ReqBody;
  try {
    body = (await request.json()) as ReqBody;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const source = (body.source ?? "tr").toLowerCase();
  const targets = (body.targets ?? []).map((t) => t.toLowerCase()).filter(Boolean);
  const bundle = body.bundle ?? {};

  if (!targets.length) {
    return NextResponse.json({ error: "targets boş" }, { status: 400 });
  }

  try {
    const results: Record<string, TourBundle> = {};
    // Diller arası paralel — DeepL Free 1 anahtarla concurrent OK
    await Promise.all(
      targets.map(async (t) => {
        if (t === source) return; // aynı dile çevirme
        results[t] = await translateTourBundle(bundle, t, source);
      })
    );
    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Çeviri başarısız";
    console.error("translate/tour:", err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
