import Link from "next/link";
import { BookOpen, LayoutDashboard, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HelpTopBarProps {
  isAuthenticated?: boolean;
}

export function HelpTopBar({ isAuthenticated }: HelpTopBarProps) {
  return (
    <header className="border-b bg-white/90 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/help"
          className="flex items-center gap-2 font-semibold text-gray-900 hover:text-primary transition-colors"
        >
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">Kullanım Rehberi</span>
          <span className="sm:hidden">Rehber</span>
        </Link>
        <Button variant="outline" size="sm" asChild>
          <Link href={isAuthenticated ? "/dashboard" : "/login"}>
            {isAuthenticated ? (
              <>
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                Panele dön
              </>
            ) : (
              <>
                <LogIn className="mr-1.5 h-4 w-4" />
                Giriş yap
              </>
            )}
          </Link>
        </Button>
      </div>
    </header>
  );
}
