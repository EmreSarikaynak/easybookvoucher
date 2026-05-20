import {
  FileText,
  Users,
  TrendingUp,
  Calendar,
  ArrowRight,
  PlusCircle,
  DollarSign,
  Headphones,
  BarChart3,
  Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { AnnouncementMarquee } from "@/components/dashboard/announcement-marquee";
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
          href: "/reports",
        },
      ];
    } else {
      statCards = [];
    }

    quickLinks = [
      { label: "Yeni Bilet Oluştur", href: "/vouchers/new", primary: true },
      { label: "Biletlerimi Gör", href: "/vouchers" },
      { label: "Tur Maliyetleri", href: "/tour-costs" },
      { label: "Destek Talebi Aç", href: "/support" },
      { label: "Raporlar", href: "/reports" },
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
          icon: DollarSign,
          label: "Tur Maliyetleri",
          href: "/tour-costs",
          color: "bg-orange-500",
        },
        {
          icon: BarChart3,
          label: "Raporlar",
          href: "/reports",
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

      {/* İstatistik Kartları */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card className="transition-all hover:shadow-md active:scale-[0.98] touch-manipulation h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg ${stat.color} p-2`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl sm:text-3xl font-bold">
                      {stat.value}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {stat.title}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Hızlı Eylem Butonları (büyük ekran) */}
      <div className="hidden lg:block">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          Hızlı Erişim
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {quickActionCards.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 bg-white border rounded-xl hover:shadow-md transition-all group"
            >
              <div
                className={`${action.color} rounded-xl p-3 group-hover:scale-110 transition-transform`}
              >
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium text-center">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Hızlı Erişim Linkleri (mobil) */}
      <div className="lg:hidden">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          Hızlı Erişim
        </h2>
        <div className="space-y-2">
          {quickLinks.map((link, i) =>
            link.primary ? (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between p-4 bg-primary text-primary-foreground rounded-lg"
              >
                <span className="font-medium">{link.label}</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <Link
                key={`${link.href}-${i}`}
                href={link.href}
                className="flex items-center justify-between p-4 bg-white border rounded-lg"
              >
                <span className="font-medium">{link.label}</span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
