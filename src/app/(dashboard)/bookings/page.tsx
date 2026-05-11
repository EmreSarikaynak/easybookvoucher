import { getBookings } from "@/app/actions/booking";
import { getCurrentUser } from "@/lib/auth-helpers";
import { CURRENCY_SYMBOLS, STATUS_LABELS } from "@/lib/types";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Plus, Ship, Calendar, User, Download } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
    const { data: bookings, error } = await getBookings();
    const currentUser = await getCurrentUser();

    const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";
    const pageTitle = isAdmin ? "Tüm Tekne Kiralamaları" : "Tekne Kiralamalarım";
    const pageDescription = isAdmin
        ? "Tüm acenta rezervasyonlarını görüntüleyin"
        : "Acentanıza ait rezervasyonları görüntüleyin";
    const emptyMessage = isAdmin
        ? "Henüz hiç kiralama kaydı yok"
        : "Henüz kiralama kaydı yok veya acentanıza ait kayıt bulunmuyor";

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {pageTitle}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {pageDescription}
                    </p>
                </div>

                <Link
                    href="/bookings/new"
                    className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Kiralama
                </Link>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Bookings List */}
            {bookings && bookings.length > 0 ? (
                <div className="space-y-4">
                    {bookings.map((booking) => (
                        <Link
                            key={booking.id}
                            href={`/bookings/${booking.id}`}
                            className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
                        >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Ship className="w-5 h-5 text-teal-600" />
                                        <h3 className="font-semibold text-lg text-gray-900">
                                            {booking.boat?.name || "Tekne"}
                                        </h3>
                                        <span
                                            className={`text-xs px-2 py-1 rounded ${booking.status === "active"
                                                ? "bg-green-100 text-green-700"
                                                : booking.status === "cancelled"
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-blue-100 text-blue-700"
                                                }`}
                                        >
                                            {STATUS_LABELS[booking.status]}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            <span>{booking.customer_info.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                {format(new Date(booking.booking_date), "d MMMM yyyy", {
                                                    locale: tr,
                                                })}
                                            </span>
                                        </div>
                                    </div>

                                    {booking.departure_port && (
                                        <div className="mt-2 text-sm text-gray-500">
                                            📍 {booking.departure_port}
                                        </div>
                                    )}
                                </div>

                                <div className="text-right">
                                    <div className="text-lg font-bold text-gray-900">
                                        {CURRENCY_SYMBOLS[booking.payment_details.currency]}
                                        {booking.payment_details.total.toLocaleString("tr-TR")}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Kapora:{" "}
                                        {CURRENCY_SYMBOLS[booking.payment_details.currency]}
                                        {booking.payment_details.paid.toLocaleString("tr-TR")}
                                    </div>
                                    {booking.payment_details.remaining > 0 && (
                                        <div className="text-sm text-red-600 font-medium">
                                            Rest:{" "}
                                            {CURRENCY_SYMBOLS[booking.payment_details.currency]}
                                            {booking.payment_details.remaining.toLocaleString(
                                                "tr-TR"
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <Ship className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-4">
                        {emptyMessage}
                    </p>
                    <Link
                        href="/bookings/new"
                        className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        İlk Kiralamayı Oluştur
                    </Link>
                </div>
            )}

            {/* Stats */}
            {bookings && bookings.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-gray-600 text-sm">Toplam Kiralama</div>
                        <div className="text-2xl font-bold text-gray-900">
                            {bookings.length}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-gray-600 text-sm">Aktif Rezervasyonlar</div>
                        <div className="text-2xl font-bold text-green-600">
                            {bookings.filter((b) => b.status === "active").length}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-gray-600 text-sm">Bekleyen Ödeme</div>
                        <div className="text-2xl font-bold text-yellow-600">
                            {
                                bookings.filter((b) => b.payment_details.remaining > 0 && b.status === "active")
                                    .length
                            }
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
