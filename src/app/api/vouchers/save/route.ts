import { NextResponse } from "next/server";
import { createVoucher, updateVoucher } from "@/app/actions/voucher";
import type { CurrencyType } from "@/lib/types";

interface VoucherPayload {
  voucher_no: string;
  tour_id: string | null;
  tour_date: string;
  customer_name: string;
  customer_phone: string | null;
  hotel: string;
  room_no: string;
  pax_adult: number;
  pax_child: number;
  pax_infant: number;
  pickup_place: string;
  pickup_time: string | null;
  total_price: number;
  currency: CurrencyType;
  deposit_paid: number;
  notes: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      payload?: VoucherPayload;
    };

    if (!body.payload) {
      return NextResponse.json(
        { error: "Bilet bilgileri eksik" },
        { status: 400 }
      );
    }

    const result = body.id
      ? await updateVoucher(body.id, body.payload)
      : await createVoucher(body.payload);

    const status = "error" in result && result.error ? 400 : 200;
    return NextResponse.json(result, { status });
  } catch (err: unknown) {
    console.error("Voucher save API error:", err);
    const message = err instanceof Error ? err.message : "Beklenmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
