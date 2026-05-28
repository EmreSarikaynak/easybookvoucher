import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Login sayfasına giriş yapmış kullanıcı gelirse dashboard'a yönlendir
  if (user && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Korumalı sayfalara giriş yapmamış kullanıcı gelirse login'e yönlendir
  const protectedPaths = [
    "/dashboard",
    "/vouchers",
    "/agencies",
    "/reports",
    "/earnings",
    "/cari",
    "/settings",
    "/users",
    "/tours",
    "/announcements",
    "/tour-costs",
    "/support",
    "/fleet",
    "/operations",
    "/bookings",
    "/help-pages",
  ];
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));
  
  if (!user && isProtectedPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/agencies/:path*",
    "/reports/:path*",
    "/earnings/:path*",
    "/cari/:path*",
    "/settings/:path*",
    "/users/:path*",
    "/vouchers/:path*",
    "/tours/:path*",
    "/announcements/:path*",
    "/tour-costs/:path*",
    "/support/:path*",
    "/fleet/:path*",
    "/operations/:path*",
    "/bookings/:path*",
    "/help-pages/:path*",
  ],
};
