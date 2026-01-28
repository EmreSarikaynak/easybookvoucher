import type { UserRole } from "@/types";

export interface MenuItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

export const MENU_ITEMS: MenuItem[] = [
  {
    label: "Ana Sayfa",
    href: "/dashboard",
    icon: "home",
    roles: ["admin", "acente", "satici"],
  },
  {
    label: "Voucher'lar",
    href: "/dashboard/vouchers",
    icon: "ticket",
    roles: ["admin", "acente", "satici"],
  },
  {
    label: "Raporlar",
    href: "/dashboard/reports",
    icon: "chart",
    roles: ["admin", "acente", "satici"],
  },
  {
    label: "Turlar",
    href: "/dashboard/tours",
    icon: "map",
    roles: ["admin"],
  },
  {
    label: "Komisyonlar",
    href: "/dashboard/commissions",
    icon: "percent",
    roles: ["admin"],
  },
  {
    label: "Kullanıcılar",
    href: "/dashboard/users",
    icon: "users",
    roles: ["admin", "acente"],
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Super Admin",
  acente: "Acente Yöneticisi",
  satici: "Satıcı",
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺",
  EUR: "€",
  USD: "$",
  GBP: "£",
};
