import { FileText, Users, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";

interface DashboardStats {
  totalVouchers: number;
  activeVouchers: number;
  todayVouchers: number;
  totalAgencies: number;
}

async function getStats(): Promise<DashboardStats> {
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

export default async function DashboardPage() {
  const stats = await getStats();

  const statCards = [
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Hoş Geldiniz</h1>
        <p className="text-sm text-muted-foreground">
          EasyBook Bilet Yönetim Sistemi
        </p>
      </div>

      {/* İstatistik Kartları - Mobilde 2x2 grid */}
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
                  <p className="text-2xl sm:text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {stat.title}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Hızlı Erişim Linkleri - Mobil için */}
      <div className="lg:hidden">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Hızlı Erişim</h2>
        <div className="space-y-2">
          <Link href="/vouchers/new" className="flex items-center justify-between p-4 bg-primary text-primary-foreground rounded-lg">
            <span className="font-medium">Yeni Bilet Oluştur</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/vouchers" className="flex items-center justify-between p-4 bg-white border rounded-lg">
            <span className="font-medium">Tüm Biletleri Gör</span>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}
