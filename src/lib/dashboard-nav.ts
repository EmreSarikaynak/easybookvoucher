import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  BarChart3,
  Building2,
  Users,
  Settings,
  MapPin,
  Anchor,
  Calendar,
  Ship,
  DollarSign,
  MessageSquare,
  Headphones,
  Megaphone,
  BookOpen,
  FileStack,
  Wallet,
} from "lucide-react";
import type { Profile, UserRole } from "@/lib/types";

export type DashboardNavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Sadece super_admin ve admin */
  adminOnly?: boolean;
  /** Tur kataloğu — admin düzenler, acente görüntüler */
  toursMenu?: boolean;
  /** Tur maliyetleri & acente fiyatlandırma — admin "Tur Maliyetleri", acente `agencyLabel` ile görür */
  costsMenu?: boolean;
  /** costsMenu için acente kullanıcıya gösterilecek alternatif etiket */
  agencyLabel?: string;
  /** Tüm giriş yapmış kullanıcılar (duyuru sayfası) */
  announcementsMenu?: boolean;
  /** Alt mobil menüde öncelikli göster */
  bottomNavPriority?: number;
};

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, bottomNavPriority: 1 },
  { name: "Biletler", href: "/vouchers", icon: FileText, bottomNavPriority: 2 },
  { name: "Yeni Bilet", href: "/vouchers/new", icon: PlusCircle, bottomNavPriority: 3 },
  { name: "Raporlar", href: "/reports", icon: BarChart3, adminOnly: true },
  { name: "Kazançlar", href: "/earnings", icon: Wallet },
  { name: "Turlar", href: "/tours", icon: MapPin, toursMenu: true, bottomNavPriority: 4 },
  { name: "Tur Kataloğu", href: "/tours/catalog", icon: BookOpen, toursMenu: true },
  { name: "Duyurular", href: "/announcements", icon: Megaphone, announcementsMenu: true, bottomNavPriority: 5 },
  { name: "Filo Yönetimi", href: "/fleet", icon: Anchor, adminOnly: true },
  { name: "Operasyon Takvimi", href: "/operations", icon: Calendar, adminOnly: true },
  { name: "Tekne Kiralamaları", href: "/bookings", icon: Ship },
  { name: "iTur Fiyat", agencyLabel: "iTur Fiyat", href: "/tour-costs", icon: DollarSign, costsMenu: true },
  { name: "Acenteler", href: "/agencies", icon: Building2, adminOnly: true },
  { name: "Kullanıcılar", href: "/users", icon: Users, adminOnly: true },
  { name: "WhatsApp Logları", href: "/whatsapp-logs", icon: MessageSquare, adminOnly: true },
  { name: "Sayfa Yönetimi", href: "/help-pages", icon: FileStack, adminOnly: true },
  { name: "Destek Talepleri", href: "/support", icon: Headphones },
  { name: "Ayarlar", href: "/settings", icon: Settings },
];

function isAdminRole(role: UserRole | undefined): boolean {
  return role === "super_admin" || role === "admin";
}

function canViewToursMenu(profile: Profile | null): boolean {
  if (!profile) return false;
  if (isAdminRole(profile.role)) return true;
  return (
    (profile.role === "agency_admin" || profile.role === "sales") &&
    !!profile.agency_id
  );
}

function canViewCostsMenu(profile: Profile | null): boolean {
  if (!profile) return false;
  if (isAdminRole(profile.role)) return true;
  return (
    (profile.role === "agency_admin" || profile.role === "sales") &&
    !!profile.agency_id
  );
}

export function filterDashboardNav(profile: Profile | null): DashboardNavItem[] {
  const isAdmin = isAdminRole(profile?.role);
  const viewTours = canViewToursMenu(profile);
  const viewCosts = canViewCostsMenu(profile);

  return DASHBOARD_NAV.filter((item) => {
    if (item.toursMenu) return viewTours;
    if (item.costsMenu) return viewCosts;
    if (item.announcementsMenu) return !!profile;
    if (item.adminOnly) return isAdmin;
    return true;
  }).map((item) => {
    if (item.costsMenu && !isAdmin && item.agencyLabel) {
      return { ...item, name: item.agencyLabel };
    }
    return item;
  });
}

export function getBottomNavItems(profile: Profile | null): DashboardNavItem[] {
  const all = filterDashboardNav(profile);
  const withPriority = all.filter((i) => i.bottomNavPriority != null);
  return withPriority.sort(
    (a, b) => (a.bottomNavPriority ?? 99) - (b.bottomNavPriority ?? 99)
  );
}

export function canManageAnnouncements(profile: Profile | null): boolean {
  return isAdminRole(profile?.role);
}
