"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { BoatBooking, Boat } from "@/lib/types";
import { BoatTicket } from "@/components/boat/boat-ticket";
import { cancelBooking } from "@/app/actions/booking";
import { downloadPDF } from "@/lib/pdf";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
    ArrowLeft,
    Download,
    Edit,
    XCircle,
    Ship,
    Calendar,
    Users,
    CreditCard,
    Clock,
    MapPin,
    Phone,
    Mail,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface BookingDetailClientProps {
    booking: BoatBooking & { boat?: Boat };
}

export default function BookingDetailClient({
    booking,
}: BookingDetailClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const ticketRef = useRef<HTMLDivElement>(null);

    const boat = booking.boat;
    const customerInfo = booking.customer_info as any;
    const paymentDetails = booking.payment_details as any;

    const handleDownloadPDF = async () => {
        if (!ticketRef.current) return;

        setLoading(true);
        try {
            const filename = `boat-ticket-${booking.id.slice(0, 8)}`;
            await downloadPDF(ticketRef.current, filename);
        } catch (error) {
            console.error("PDF download error:", error);
        }
        setLoading(false);
    };

    const handleCancel = async () => {
        setLoading(true);
        const { error } = await cancelBooking(booking.id);
        setLoading(false);

        if (error) {
            alert(error);
        } else {
            router.push("/bookings");
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/bookings"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Tüm Rezervasyonlar
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Rezervasyon Detayı
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {boat?.name || "Tekne"} -{" "}
                            {format(new Date(booking.booking_date), "d MMMM yyyy", {
                                locale: tr,
                            })}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            PDF İndir
                        </button>
                        <Link
                            href={`/bookings/${booking.id}/edit`}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Edit className="w-4 h-4" />
                            Düzenle
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Boat Images */}
                    {boat && boat.gallery && boat.gallery.length > 0 && (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4">
                                {boat.gallery.map((url, index) => (
                                    <div key={index} className="relative h-40">
                                        <Image
                                            src={url}
                                            alt={`${boat.name} - Resim ${index + 1}`}
                                            fill
                                            className="object-cover rounded-lg"
                                        />
                                        {index === 0 && (
                                            <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                                                Öne Çıkan
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Boat Details */}
                    {boat && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Ship className="w-5 h-5 text-teal-600" />
                                <h2 className="text-lg font-semibold">Tekne Bilgileri</h2>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <div className="text-sm text-gray-600">Uzunluk</div>
                                    <div className="font-semibold">
                                        {boat.specifications.length_meters}m
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-600">Kapasite</div>
                                    <div className="font-semibold">
                                        {boat.specifications.capacity_max} kişi
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-600">Mürettebat</div>
                                    <div className="font-semibold">
                                        {boat.specifications.crew_count} kişi
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-600">Fiyat</div>
                                    <div className="font-semibold">
                                        {boat.base_price} {boat.currency}
                                    </div>
                                </div>
                            </div>

                            {boat.specifications.equipment &&
                                boat.specifications.equipment.length > 0 && (
                                    <div className="mt-4">
                                        <div className="text-sm text-gray-600 mb-2">Ekipman</div>
                                        <div className="flex flex-wrap gap-2">
                                            {boat.specifications.equipment.map((item) => (
                                                <span
                                                    key={item}
                                                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                                                >
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                        </div>
                    )}

                    {/* Booking Details */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="w-5 h-5 text-teal-600" />
                            <h2 className="text-lg font-semibold">Rezervasyon Detayları</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <div className="text-sm text-gray-600">Kiralama Tarihi</div>
                                    <div className="font-medium">
                                        {format(new Date(booking.booking_date), "d MMMM yyyy EEEE", {
                                            locale: tr,
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <div className="text-sm text-gray-600">Saat Aralığı</div>
                                    <div className="font-medium">
                                        {booking.check_in_time || "10:00"} -{" "}
                                        {booking.check_out_time || "18:00"}
                                    </div>
                                </div>
                            </div>

                            {booking.departure_port && (
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <div className="text-sm text-gray-600">Kalkış Limanı</div>
                                        <div className="font-medium">{booking.departure_port}</div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-3">
                                <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <div className="text-sm text-gray-600">Misafir Sayısı</div>
                                    <div className="font-medium">{customerInfo.guests} kişi</div>
                                </div>
                            </div>
                        </div>

                        {booking.notes && (
                            <div className="mt-4 pt-4 border-t">
                                <div className="text-sm text-gray-600 mb-1">Notlar</div>
                                <p className="text-gray-800">{booking.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Customer Info */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-teal-600" />
                            <h2 className="text-lg font-semibold">Müşteri Bilgileri</h2>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <div className="text-sm text-gray-600">Ad Soyad</div>
                                <div className="font-medium">{customerInfo.name}</div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <a
                                    href={`tel:${customerInfo.phone}`}
                                    className="text-blue-600 hover:underline"
                                >
                                    {customerInfo.phone}
                                </a>
                            </div>

                            {customerInfo.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <a
                                        href={`mailto:${customerInfo.email}`}
                                        className="text-blue-600 hover:underline text-sm"
                                    >
                                        {customerInfo.email}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CreditCard className="w-5 h-5 text-teal-600" />
                            <h2 className="text-lg font-semibold">Ödeme Bilgileri</h2>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Toplam Tutar</span>
                                <span className="text-xl font-bold">
                                    {paymentDetails.total} {paymentDetails.currency}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-green-600">
                                <span>Kapora</span>
                                <span className="font-semibold">{paymentDetails.paid}</span>
                            </div>

                            {paymentDetails.remaining > 0 && (
                                <div className="flex justify-between items-center text-red-600 pt-3 border-t">
                                    <span>Rest</span>
                                    <span className="font-bold text-xl">
                                        {paymentDetails.remaining} {paymentDetails.currency}
                                    </span>
                                </div>
                            )}

                            {paymentDetails.remaining === 0 && paymentDetails.paid > 0 && (
                                <div className="bg-green-50 text-green-700 px-3 py-2 rounded text-sm text-center">
                                    ✓ Ödeme Tamamlandı
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4">İşlemler</h2>
                        <div className="space-y-2">
                            <button
                                onClick={() => setShowCancelConfirm(true)}
                                disabled={booking.status === "cancelled"}
                                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <XCircle className="w-4 h-4" />
                                Rezervasyonu İptal Et
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden PDF Ticket */}
            <div className="fixed -left-[9999px] top-0">
                <BoatTicket booking={booking} containerRef={ticketRef} />
            </div>

            {/* Cancel Confirmation Modal */}
            {showCancelConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md">
                        <h3 className="text-lg font-bold mb-2">Rezervasyonu İptal Et</h3>
                        <p className="text-gray-600 mb-4">
                            Bu rezervasyonu iptal etmek istediğinize emin misiniz? Bu işlem
                            takvim doluluk durumunu güncelleyecektir.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                disabled={loading}
                                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                Evet, İptal Et
                            </button>
                            <button
                                onClick={() => setShowCancelConfirm(false)}
                                className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                            >
                                Vazgeç
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
