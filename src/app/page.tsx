"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signInWithIdentifier } from "@/app/actions/auth";
import { Mail, Lock, Loader2, Waves } from "lucide-react";
import { SecestaFooter } from "@/components/layout/secesta-footer";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);

  // Fetch Logo
  useEffect(() => {
    import("@/app/actions/settings").then(mod => {
      mod.getSetting("site_logo").then(logo => {
        if (typeof logo === 'string') setSiteLogo(logo);
        setLogoLoading(false);
      });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signInWithIdentifier(identifier, password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="relative flex flex-1 items-center justify-center p-4">
      {/* Animated Ocean Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0093E9] via-[#56CCF2] to-[#80D0C7] animate-gradient-shift">
        {/* Overlay Pattern for depth */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.2) 2%, transparent 0%), 
                             radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.2) 2%, transparent 0%)`,
            backgroundSize: '100px 100px'
          }}></div>
        </div>

        {/* Floating wave decorations */}
        <div className="absolute bottom-0 left-0 right-0 opacity-20">
          <svg viewBox="0 0 1200 120" className="w-full h-24">
            <path d="M0,60 C300,100 900,20 1200,60 L1200,120 L0,120 Z" fill="white" />
          </svg>
        </div>
      </div>

      {/* Login Card with Glassmorphism */}
      <Card className="relative w-full max-w-md backdrop-blur-xl bg-white/90 border-white/20 shadow-2xl">
        <CardHeader className="text-center flex flex-col items-center space-y-2 pb-4">
          {/* Logo - Only show after loading completes */}
          {!logoLoading && siteLogo && (
            <div className="relative w-48 h-20 mb-2">
              <img
                src={siteLogo}
                alt="Logo"
                className="w-full h-full object-contain drop-shadow-lg"
              />
            </div>
          )}

          {/* Loading placeholder - minimal to prevent layout shift */}
          {logoLoading && (
            <div className="h-20 mb-2"></div>
          )}

          <CardDescription className="text-base text-gray-600">
            Hoş geldiniz! Giriş yaparak devam edin
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>
                  {error}
                </div>
              </div>
            )}

            {/* Email/Phone Input */}
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm font-medium text-gray-700">
                E-posta veya Telefon
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="identifier"
                  type="text"
                  placeholder="ornek@email.com veya +90 5XX XXX XX XX"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                  className="pl-11 h-12 border-gray-200 focus:border-[#0093E9] focus:ring-[#0093E9] rounded-xl text-base"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Şifre
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-11 h-12 border-gray-200 focus:border-[#0093E9] focus:ring-[#0093E9] rounded-xl text-base"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#0093E9] to-[#80D0C7] hover:from-[#0082CF] hover:to-[#6FC0B7] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </Button>
          </form>

        </CardContent>
      </Card>
      </div>

      <SecestaFooter variant="login" showPlatformNote />

      {/* Mobile-optimized spacing */}
      <style jsx global>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }

        @media (max-width: 640px) {
          .backdrop-blur-xl {
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }
        }
      `}</style>
    </div>
  );
}
