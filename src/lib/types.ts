export type UserRole = "super_admin" | "admin" | "agency_admin" | "sales";

export type CurrencyType = "TRY" | "EUR" | "USD" | "GBP";

export type VoucherStatus = "active" | "cancelled" | "completed";

export type PaymentMethod = "cash" | "credit_card" | "bank_transfer" | "other";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  agency_id: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Agency {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
}

export interface Tour {
  id: string;
  name: string;
  description: string | null;
  default_price: number;
  currency: CurrencyType;
  duration: string | null;
  pickup_locations: string[];
  is_active: boolean;
  created_at: string;
}

export interface Voucher {
  id: string;
  voucher_no: string;
  tour_id: string | null;
  tour_date: string;
  customer_name: string;
  hotel: string | null;
  room_no: string | null;
  pax_adult: number;
  pax_child: number;
  pax_infant: number;
  pickup_place: string | null;
  pickup_time: string | null;
  total_price: number;
  currency: CurrencyType;
  deposit_paid: number;
  rest_to_pay: number;
  sales_person_id: string;
  agency_id: string | null;
  status: VoucherStatus;
  notes: string | null;
  photo_url: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  tour?: Tour;
  sales_person?: Profile;
  agency?: Agency;
}

export interface VoucherTemplate {
  id: string;
  name: string;
  agency_id: string | null;
  fields_config: Record<string, unknown>;
  design_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  voucher_id: string;
  amount: number;
  currency: CurrencyType;
  payment_method: PaymentMethod;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export const CURRENCY_SYMBOLS: Record<CurrencyType, string> = {
  TRY: "\u20BA",
  EUR: "\u20AC",
  USD: "$",
  GBP: "\u00A3",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "S\u00FCper Admin",
  admin: "Admin",
  agency_admin: "Acente Y\u00F6neticisi",
  sales: "Sat\u0131c\u0131",
};

export const STATUS_LABELS: Record<VoucherStatus, string> = {
  active: "Aktif",
  cancelled: "\u0130ptal",
  completed: "Tamamland\u0131",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Nakit",
  credit_card: "Kredi Kart\u0131",
  bank_transfer: "Banka Transferi",
  other: "Di\u011Fer",
};
