import { redirect } from "next/navigation";

export default function DashboardIndexPage() {
  // Projede dashboard sayfaları route-group altında "/" seviyesinde (örn: /vouchers, /users)
  // Login/middleware "/dashboard" beklediği için buradan ana ekrana yönlendiriyoruz.
  redirect("/vouchers");
}

