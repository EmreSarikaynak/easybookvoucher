import { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { HelpTopBar } from "@/components/help/help-top-bar";
import { PlatformFooterDynamic } from "@/components/layout/platform-footer-dynamic";
import { SecestaFooter } from "@/components/layout/secesta-footer";

export const metadata: Metadata = {
  title: "Kullanım Rehberi — EasyBook Voucher",
  description:
    "EasyBook bilet ve tur yönetim sisteminin kullanım kılavuzu: bilet, katalog, WhatsApp ve daha fazlası.",
};

export default async function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100">
      <HelpTopBar isAuthenticated={!!user} />
      <div className="flex-1">{children}</div>
      <PlatformFooterDynamic variant="help" />
      <SecestaFooter variant="compact" showPlatformNote={false} />
    </div>
  );
}
