import type { HelpNavLink } from "./types";

export const HELP_HUB_PATH = "/help";

/** Footer — öne çıkan rehber linkleri */
export const FOOTER_HELP_FEATURED: HelpNavLink[] = [
  { href: "/help", label: "Tüm rehber" },
  { href: "/help/baslangic", label: "Başlangıç" },
  { href: "/help/bilet-islemleri", label: "Bilet işlemleri" },
  { href: "/help/tur-katalogu", label: "Tur kataloğu" },
  { href: "/help/whatsapp", label: "WhatsApp" },
];

/** Footer — ek hızlı linkler */
export const FOOTER_HELP_QUICK: HelpNavLink[] = [
  { href: "/help/duyurular", label: "Duyurular" },
  { href: "/help/destek", label: "Destek" },
  { href: "/help/pwa", label: "Uygulama yükleme" },
  { href: "/help/admin-panel", label: "Admin paneli" },
];

export const FOOTER_LEGAL_LINKS: HelpNavLink[] = [
  { href: "/terms", label: "Kullanım Şartları" },
  { href: "/privacy", label: "Gizlilik Politikası" },
  { href: "/kvkk", label: "KVKK" },
];
