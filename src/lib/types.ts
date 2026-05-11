export type UserRole = "super_admin" | "admin" | "agency_admin" | "sales";

export type CurrencyType = "TRY" | "EUR" | "USD" | "GBP";

export type VoucherStatus = "active" | "cancelled" | "completed";

export type PaymentStatus = "pending" | "paid";

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
  agency?: Agency;
}

export interface Agency {
  id: string;
  agency_code: string;
  name: string;
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
  images: string[];
  tour_url: string | null;
  is_active: boolean;
  created_at: string;
  tour_managers?: { name: string; phone: string }[];
  base_price_adult_eur?: number;
  base_price_child_eur?: number;
  base_price_adult_try?: number;
  base_price_child_try?: number;
}

export interface AgencyTourPrice {
  id: string;
  agency_id: string;
  tour_id: string;
  price: number;
  currency: CurrencyType;
  created_at: string;
  updated_at: string;
  // Joined fields
  agency?: Agency;
  tour?: Tour;
}

export interface ExchangeRate {
  id: string;
  from_currency: CurrencyType;
  to_currency: CurrencyType;
  rate: number;
  effective_date: string; // Date when this rate becomes effective
  created_at?: string;
  updated_at: string;
}

// Exchange rate snapshot for capturing rates at voucher creation time
export interface ExchangeRateSnapshot {
  date: string;
  rates: {
    [fromCurrency: string]: {
      [toCurrency: string]: number;
    };
  };
}

export interface Voucher {
  id: string;
  voucher_no: string;
  tour_id: string | null;
  tour_date: string;
  customer_name: string;
  customer_phone: string | null;
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
  agency_payment_status: PaymentStatus;
  agency_payment_date: string | null;
  notes: string | null;
  photo_url: string | null;
  pdf_url: string | null;
  exchange_rate_snapshot: ExchangeRateSnapshot | null; // Snapshot of rates at creation
  agent_owes_easybook_eur: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  tour?: Tour;
  sales_person?: Profile;
  agency?: Agency;
}

export interface AgentPayment {
  id: string;
  agent_id: string;
  payment_amount: number;
  payment_currency: CurrencyType;
  payment_date: string;
  related_voucher_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // Joined fields
  agency?: Agency;
  voucher?: Voucher;
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
  credit_card: "Kredi Kartı",
  bank_transfer: "Banka Transferi",
  other: "Diğer",
};

export const DURATION_OPTIONS = [
  { value: "half_day", label: "Yarım Gün" },
  { value: "full_day", label: "Tam Gün" },
  { value: "2_hours", label: "2 Saat" },
  { value: "3_hours", label: "3 Saat" },
  { value: "4_hours", label: "4 Saat" },
  { value: "7_hours", label: "7 Saat" },
  { value: "multi_day", label: "Çok Günlü" },
] as const;

export const CURRENCY_OPTIONS: CurrencyType[] = ["EUR", "USD", "TRY", "GBP"];

// ========================  BOAT RENTAL TYPES  ========================

export type BoatStatus = "active" | "maintenance" | "inactive";
export type OccupancyStatus = "available" | "booked" | "pending" | "blocked";

export interface BoatSpecifications {
  length_meters: number;
  capacity_max: number;
  crew_count: number;
  equipment: string[];
  // Extended specifications (all optional for backward compatibility)
  width_meters?: number;
  draft_meters?: number;
  year_built?: number;
  engine_type?: string;
  engine_power_hp?: number;
  fuel_type?: string;
  hull_material?: string;
  cabin_count?: number;
  bathroom_count?: number;
  water_tank_liters?: number;
  fuel_tank_liters?: number;
}

export interface Boat {
  id: string;
  name: string;
  specifications: BoatSpecifications;
  base_price: number;
  currency: CurrencyType;
  gallery: string[];
  status: BoatStatus;
  created_at: string;
  updated_at: string;
}

export interface OccupancyCalendar {
  id: string;
  boat_id: string;
  date: string;
  status: OccupancyStatus;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  boat?: Boat;
  booking?: BoatBooking;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  guests: number;
}

export interface PaymentDetails {
  total: number;
  paid: number;
  remaining: number;
  currency: CurrencyType;
}

export interface CaptainInfo {
  name: string;
  license: string;
}

export interface BookingExtras {
  food: boolean;
  fuel_included: boolean;
  notes: string;
}

export interface BoatBooking {
  id: string;
  boat_id: string;
  booking_date: string;
  customer_info: CustomerInfo;
  payment_details: PaymentDetails;
  check_in_time: string | null;
  check_out_time: string | null;
  captain_info: CaptainInfo | null;
  extras: BookingExtras | null;
  departure_port: string | null;
  agency_id: string | null;
  sales_person_id: string;
  status: VoucherStatus;
  notes: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  boat?: Boat;
  agency?: Agency;
  sales_person?: Profile;
}

export const BOAT_STATUS_LABELS: Record<BoatStatus, string> = {
  active: "Aktif",
  maintenance: "Bakımda",
  inactive: "Pasif",
};

export const OCCUPANCY_STATUS_LABELS: Record<OccupancyStatus, string> = {
  available: "Müsait",
  booked: "Dolu",
  pending: "Ödeme Bekliyor",
  blocked: "Bloke",
};

export const OCCUPANCY_COLORS: Record<OccupancyStatus, string> = {
  available: "bg-green-500",
  booked: "bg-red-500",
  pending: "bg-yellow-500",
  blocked: "bg-gray-500",
};

// Engine type options
export const ENGINE_TYPE_OPTIONS = [
  "Dizel",
  "Benzinli",
  "Elektrik",
  "Hibrit",
  "Yelkenli",
] as const;

// Fuel type options
export const FUEL_TYPE_OPTIONS = [
  "Dizel",
  "Benzin",
  "Elektrik",
  "Yok (Yelken)",
] as const;

// Hull material options
export const HULL_MATERIAL_OPTIONS = [
  "Fiberglass",
  "Ahşap",
  "Çelik",
  "Alüminyum",
  "Karbon Fiber",
  "GRP",
] as const;

// Equipment options organized by category
export const BOAT_EQUIPMENT_CATEGORIES = {
  "🎣 Su Sporları & Aktivite": [
    "Balıkçılık Ekipmanı",
    "Şnorkel Ekipmanı",
    "Dalgıç Ekipmanı",
    "Su Kayağı",
    "Wakeboard",
    "Jet Ski",
    "Kano/Kayak",
    "Trampolin",
    "Yelken Takımı",
    "SUP Board",
  ],
  "🔧 Teknik & Navigasyon": [
    "Jeneratör",
    "Otopiyon",
    "GPS/Navigasyon",
    "Radar",
    "Telsiz/VHF",
    "Güneş Enerjisi",
    "Bow Thruster",
  ],
  "🏠 Konfor & Yaşam": [
    "Klima",
    "Ses Sistemi",
    "Buzdolabı",
    "Duş",
    "WC",
    "Güneş Brandası",
    "Wifi",
    "TV",
    "Jakuzi",
    "Mangal/BBQ",
    "Dış Mutfak",
    "Çamaşır Makinesi",
    "Bulaşık Makinesi",
  ],
  "🛡️ Güvenlik": [
    "Yangın Söndürücü",
    "İlk Yardım Kiti",
    "Can Yeleği",
    "Can Simidi",
    "EPIRB",
  ],
} as const;

// Flat list for backward compatibility
export const BOAT_EQUIPMENT_OPTIONS = Object.values(BOAT_EQUIPMENT_CATEGORIES).flat();

export const DEPARTURE_PORTS = [
  "Bodrum Marina",
  "Turgutreis Limanı",
  "Gümbet İskelesi",
  "Yalıkavak Marina",
  "Bitez Sahili",
  "Torba Körfezi",
] as const;

// ========================  WHATSAPP LOG TYPES  ========================

export type WhatsAppMessageDirection = "outbound" | "inbound";
export type WhatsAppMessageStatus = "queued" | "sent" | "delivered" | "read" | "failed" | "received";

export interface WhatsAppLog {
  id: string;
  message_sid: string;
  voucher_no: string | null;
  phone_number: string;
  direction: WhatsAppMessageDirection;
  body: string;
  status: WhatsAppMessageStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
