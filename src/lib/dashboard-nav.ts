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
  Receipt,
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
  /** Cari hesap — admin tüm acentelerin listesini, acente sadece kendi bakiyesini görür */
  cariMenu?: boolean;
  /** costsMenu için acente kullanıcıya gösterilecek alternatif etiket */
  agencyLabel?: string;
  /** Tüm giriş yapmış kullanıcılar (duyuru sayfası) */
  announcementsMenu?: boolean;
  /** Alt mobil menüde öncelikli göster */
  bottomNavPriority?: number;
  /**
   * Kâr/maliyet gibi hassas finansal sayfalar. Müşteri yanında ekranda
   * görünmemesi için ana menüde değil, varsayılan kapalı "Profilim"
   * grubunun altında listelenir.
   */
  profileMenu?: boolean;
};

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, bottomNavPriority: 1 },
  { name: "Biletler", href: "/vouchers", icon: FileText, bottomNavPriority: 2 },
  { name: "Yeni Bilet", href: "/vouchers/new", icon: PlusCircle, bottomNavPriority: 3 },
  { name: "Raporlar", href: "/reports", icon: BarChart3, adminOnly: true },
  { name: "Acente Cari", agencyLabel: "Cari Hesabım", href: "/cari", icon: Receipt, cariMenu: true },
  { name: "Kazançlar", href: "/earnings", icon: Wallet, profileMenu: true },
  { name: "Turlar", href: "/tours", icon: MapPin, toursMenu: true, bottomNavPriority: 4 },
  { name: "Tur Kataloğu", href: "/tours/catalog", icon: BookOpen, toursMenu: true },
  { name: "Duyurular", href: "/announcements", icon: Megaphone, announcementsMenu: true, bottomNavPriority: 5 },
  { name: "Filo Yönetimi", href: "/fleet", icon: Anchor, adminOnly: true },
  { name: "Operasyon Takvimi", href: "/operations", icon: Calendar, adminOnly: true },
  { name: "Tekne Kiralamaları", href: "/bookings", icon: Ship },
  { name: "Tur Maliyetleri", agencyLabel: "iTur Fiyat", href: "/tour-costs", icon: DollarSign, costsMenu: true, profileMenu: true },
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

function canViewCariMenu(profile: Profile | null): boolean {
  if (!profile) return false;
  if (isAdminRole(profile.role)) return true;
  // Acente kullanıcısı sadece kendi bakiyesini görür; agency_id şart.
  return (
    (profile.role === "agency_admin" || profile.role === "sales") &&
    !!profile.agency_id
  );
}

/** Bir menü öğesinin kullanıcı rolüne göre görünür olup olmadığı. */
function passesRoleFilter(
  item: DashboardNavItem,
  profile: Profile | null
): boolean {
  if (item.toursMenu) return canViewToursMenu(profile);
  if (item.costsMenu) return canViewCostsMenu(profile);
  if (item.cariMenu) return canViewCariMenu(profile);
  if (item.announcementsMenu) return !!profile;
  if (item.adminOnly) return isAdminRole(profile?.role);
  return true;
}

/** Acente kullanıcısına alternatif etiket uygula (örn. "iTur Fiyat"). */
function applyAgencyLabel(
  item: DashboardNavItem,
  profile: Profile | null
): DashboardNavItem {
  if (
    (item.costsMenu || item.cariMenu) &&
    !isAdminRole(profile?.role) &&
    item.agencyLabel
  ) {
    return { ...item, name: item.agencyLabel };
  }
  return item;
}

/**
 * Cari menüsü: admin → ana menüde (öncelikli erişim),
 * acente kullanıcı → "Profilim" altında (müşteri yanında yanlışlıkla
 * açılmaması için kapalı grupta).
 */
function isCariInProfileGroup(
  item: DashboardNavItem,
  profile: Profile | null
): boolean {
  return !!item.cariMenu && !isAdminRole(profile?.role);
}

/** Ana menü: "Profilim" altına taşınan finansal öğeler hariç. */
export function filterDashboardNav(profile: Profile | null): DashboardNavItem[] {
  return DASHBOARD_NAV.filter(
    (item) =>
      !item.profileMenu &&
      !isCariInProfileGroup(item, profile) &&
      passesRoleFilter(item, profile)
  ).map((item) => applyAgencyLabel(item, profile));
}

/** "Profilim" grubu: kâr/maliyet gibi hassas, varsayılan kapalı öğeler. */
export function getProfileNavItems(profile: Profile | null): DashboardNavItem[] {
  return DASHBOARD_NAV.filter(
    (item) =>
      (item.profileMenu || isCariInProfileGroup(item, profile)) &&
      passesRoleFilter(item, profile)
  ).map((item) => applyAgencyLabel(item, profile));
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
