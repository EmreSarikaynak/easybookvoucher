import type { HelpNavLink } from "./types";

export const HELP_HUB_PATH = "/help";

export const FOOTER_HUB_LINK: HelpNavLink = {
  href: HELP_HUB_PATH,
  label: "Tüm rehber",
};

/** Footer — öne çıkan rehber linkleri (DB yokken yedek) */
export const FOOTER_HELP_FEATURED: HelpNavLink[] = [
  FOOTER_HUB_LINK,
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
