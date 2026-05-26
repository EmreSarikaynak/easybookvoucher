import {
  FileText,
  Users,
  TrendingUp,
  Calendar,
  ArrowRight,
  PlusCircle,
  Headphones,
  BarChart3,
  Building2,
  BookOpen,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { AnnouncementMarquee } from "@/components/dashboard/announcement-marquee";
import { AgencyQrCard } from "@/components/dashboard/agency-qr-card";
import { buildAgencyCatalogUrl } from "@/lib/site-url";
import { qrToDataUrl } from "@/lib/qr";
import Link from "next/link";

interface StatCard {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  href: string;
}

async function getAdminStats() {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().split("T")[0];

  const [totalRes, activeRes, todayRes, agencyRes] = await Promise.all([
    supabase.from("vouchers").select("*", { count: "exact", head: true }),
    supabase
      .from("vouchers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("vouchers")
      .select("*", { count: "exact", head: true })
      .eq("tour_date", today),
    supabase
      .from("agencies")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  return {
    totalVouchers: totalRes.count ?? 0,
    activeVouchers: activeRes.count ?? 0,
    todayVouchers: todayRes.count ?? 0,
    totalAgencies: agencyRes.count ?? 0,
  };
}

async function getAgencyStats(agencyId: string) {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().split("T")[0];

  const [totalRes, activeRes, todayRes, thisMonthRes] = await Promise.all([
    supabase
      .from("vouchers")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId),
    supabase
      .from("vouchers")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "active"),
    supabase
      .from("vouchers")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("tour_date", today),
    supabase
      .from("vouchers")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .gte(
        "created_at",
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      ),
  ]);

  return {
    totalVouchers: totalRes.count ?? 0,
    activeVouchers: activeRes.count ?? 0,
    todayVouchers: todayRes.count ?? 0,
    thisMonthVouchers: thisMonthRes.count ?? 0,
  };
}

export default async function DashboardPage() {
  const profile = await getCurrentUser();
  const admin = isAdmin(profile);

  let statCards: StatCard[];
  let quickLinks: { label: string; href: string; primary?: boolean }[];
  let greeting = profile?.full_name
    ? `Hoş Geldiniz, ${profile.full_name.split(" ")[0]}`
    : "Hoş Geldiniz";

  let agencyQr: {
    code: string;
    catalogUrl: string;
    qrDataUrl: string;
  } | null = null;

  if (admin) {
    const stats = await getAdminStats();
    statCards = [
      {
        title: "Toplam Bilet",
        value: stats.totalVouchers,
        icon: FileText,
        color: "bg-blue-500",
        href: "/vouchers",
      },
      {
        title: "Aktif Bilet",
        value: stats.activeVouchers,
        icon: TrendingUp,
        color: "bg-green-500",
        href: "/vouchers?status=active",
      },
      {
        title: "Bugünün Turları",
        value: stats.todayVouchers,
        icon: Calendar,
        color: "bg-orange-500",
        href: "/vouchers",
      },
      {
        title: "Aktif Acente",
        value: stats.totalAgencies,
        icon: Users,
        color: "bg-purple-500",
        href: "/agencies",
      },
    ];
    quickLinks = [
      { label: "Yeni Bilet Oluştur", href: "/vouchers/new", primary: true },
      { label: "Tüm Biletler", href: "/vouchers" },
      { label: "Acenteler", href: "/agencies" },
      { label: "Raporlar", href: "/reports" },
      { label: "Destek Talepleri", href: "/support" },
      { label: "Ayarlar", href: "/settings" },
    ];
  } else {
    const agencyId = profile?.agency_id;
    const agencyName = profile?.agency?.name;
    if (agencyName) {
      greeting = `Hoş Geldiniz — ${agencyName}`;
    }

    if (agencyId) {
      const stats = await getAgencyStats(agencyId);
      const agencyCode = profile?.agency?.agency_code;
      const publicEnabled =
        (profile?.agency as { public_catalog_enabled?: boolean } | undefined)
          ?.public_catalog_enabled !== false;
      if (agencyCode && publicEnabled) {
        const catalogUrl = buildAgencyCatalogUrl(agencyCode);
        if (catalogUrl) {
          try {
            const qrDataUrl = await qrToDataUrl(catalogUrl, { width: 280 });
            agencyQr = { code: agencyCode, catalogUrl, qrDataUrl };
          } catch (qrErr) {
            console.error("dashboard agency qr error:", qrErr);
          }
        }
      }
      statCards = [
        {
          title: "Toplam Biletlerim",
          value: stats.totalVouchers,
          icon: FileText,
          color: "bg-blue-500",
          href: "/vouchers",
        },
        {
          title: "Aktif Biletlerim",
          value: stats.activeVouchers,
          icon: TrendingUp,
          color: "bg-green-500",
          href: "/vouchers?status=active",
        },
        {
          title: "Bugünkü Turlarım",
          value: stats.todayVouchers,
          icon: Calendar,
          color: "bg-orange-500",
          href: "/vouchers",
        },
        {
          title: "Bu Ay Biletlerim",
          value: stats.thisMonthVouchers,
          icon: BarChart3,
          color: "bg-purple-500",
          href: "/vouchers",
        },
      ];
    } else {
      statCards = [];
    }

    quickLinks = [
      { label: "Yeni Bilet Oluştur", href: "/vouchers/new", primary: true },
      { label: "Biletlerimi Gör", href: "/vouchers" },
      { label: "Tur Kataloğu", href: "/tours/catalog" },
      { label: "Destek Talebi Aç", href: "/support" },
      { label: "Kazançlar", href: "/earnings" },
    ];
  }

  const quickActionCards = admin
    ? [
        {
          icon: PlusCircle,
          label: "Yeni Bilet",
          href: "/vouchers/new",
          color: "bg-blue-600",
        },
        {
          icon: Building2,
          label: "Acenteler",
          href: "/agencies",
          color: "bg-purple-600",
        },
        {
          icon: BarChart3,
          label: "Raporlar",
          href: "/reports",
          color: "bg-orange-500",
        },
        {
          icon: Headphones,
          label: "Destek",
          href: "/support",
          color: "bg-green-600",
        },
      ]
    : [
        {
          icon: PlusCircle,
          label: "Yeni Bilet",
          href: "/vouchers/new",
          color: "bg-blue-600",
        },
        {
          icon: BookOpen,
          label: "Tur Kataloğu",
          href: "/tours/catalog",
          color: "bg-orange-500",
        },
        {
          icon: Wallet,
          label: "Kazançlar",
          href: "/earnings",
          color: "bg-purple-600",
        },
        {
          icon: Headphones,
          label: "Destek Talebi",
          href: "/support",
          color: "bg-green-600",
        },
      ];

  return (
    <div className="space-y-6">
      <AnnouncementMarquee role={profile?.role ?? null} />

      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{greeting}</h1>
        <p className="text-sm text-muted-foreground">
          EasyBook Bilet Yönetim Sistemi
        </p>
      </div>

      {agencyQr && (
        <AgencyQrCard
          agencyCode={agencyQr.code}
          catalogUrl={agencyQr.catalogUrl}
          qrDataUrl={agencyQr.qrDataUrl}
        />
      )}

      {/* İstatistik Kartları */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          {statCards.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card className="transition-all hover:shadow-md active:scale-[0.98] touch-manipulation h-full">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg ${stat.color} p-1.5 sm:p-2`}>
                      <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <p className="text-lg sm:text-2xl lg:text-3xl font-bold leading-tight">
                      {stat.value}
                    </p>
                    <p className="text-[11px] sm:text-xs lg:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-tight">
                      {stat.title}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Hızlı Erişim — tüm ekranlarda 4 kolon */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          Hızlı Erişim
        </h2>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {quickActionCards.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 bg-white border rounded-xl hover:shadow-md transition-all group"
            >
              <div
                className={`${action.color} rounded-xl p-2 sm:p-3 group-hover:scale-110 transition-transform`}
              >
                <action.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="text-[11px] sm:text-sm font-medium text-center leading-tight">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Ek hızlı linkler (mobil) — yalnızca temel eylemlerin yanına detay */}
      <div className="lg:hidden">
        <div className="space-y-2">
          {quickLinks
            .filter((link) => link.primary)
            .map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between p-4 bg-primary text-primary-foreground rounded-lg"
              >
                <span className="font-medium">{link.label}</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
