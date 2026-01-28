"use client";

import { useEffect, useState } from "react";
import { FileText, Users, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";

interface DashboardStats {
  totalVouchers: number;
  activeVouchers: number;
  todayVouchers: number;
  totalAgencies: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVouchers: 0,
    activeVouchers: 0,
    todayVouchers: 0,
    totalAgencies: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
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

      setStats({
        totalVouchers: totalRes.count ?? 0,
        activeVouchers: activeRes.count ?? 0,
        todayVouchers: todayRes.count ?? 0,
        totalAgencies: agencyRes.count ?? 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, [supabase]);

  const statCards = [
    {
      title: "Toplam Voucher",
      value: stats.totalVouchers,
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "Aktif Voucher",
      value: stats.activeVouchers,
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      title: "Bug\u00FCn\u00FCn Turlar\u0131",
      value: stats.todayVouchers,
      icon: Calendar,
      color: "text-orange-600",
    },
    {
      title: "Aktif Acente",
      value: stats.totalAgencies,
      icon: Users,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          EasyBook Voucher Y&ouml;netim Sistemi&apos;ne ho&#351; geldiniz
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              ) : (
                <p className="text-3xl font-bold">{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
