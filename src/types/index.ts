export type UserRole = "admin" | "acente" | "satici";

export type Currency = "TRY" | "EUR" | "USD" | "GBP";

export type VoucherStatus = "draft" | "confirmed" | "cancelled";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  agency_name: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Voucher {
  id: string;
  voucher_no: string;
  guest_name: string;
  tour_name: string;
  tour_date: string;
  pax_adult: number;
  pax_child: number;
  sale_price: number;
  currency: Currency;
  commission_rate: number | null;
  hotel_name: string | null;
  room_no: string | null;
  phone: string | null;
  notes: string | null;
  photo_url: string | null;
  ocr_raw_text: string | null;
  status: VoucherStatus;
  created_by: string;
  agency_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tour {
  id: string;
  name: string;
  base_price: number;
  currency: Currency;
  is_active: boolean;
}

export interface Commission {
  id: string;
  agency_id: string;
  tour_id: string;
  rate: number;
}
