"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking } from "@/app/actions/booking";
import { Boat, DEPARTURE_PORTS } from "@/lib/types";
import { Ship, User, DollarSign } from "lucide-react";
import Link from "next/link";

interface BookingFormClientProps {
    boats: Boat[];
    currentUserId: string;
}

export default function BookingFormClient({
    boats,
    currentUserId,
}: BookingFormClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        boat_id: "",
        booking_date: "",
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        guests: 1,
        total_amount: 0,
        paid_amount: 0,
        currency: "EUR" as const,
        check_in_time: "10:00",
        check_out_time: "18:00",
        departure_port: "",
        notes: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error: submitError } = await createBooking({
            boat_id: formData.boat_id,
            booking_date: formData.booking_date,
            customer_info: {
                name: formData.customer_name,
                phone: formData.customer_phone,
                email: formData.customer_email,
                guests: formData.guests,
            },
            payment_details: {
                total: formData.total_amount,
                paid: formData.paid_amount,
                remaining: formData.total_amount - formData.paid_amount,
                currency: formData.currency,
            },
            check_in_time: formData.check_in_time,
            check_out_time: formData.check_out_time,
            departure_port: formData.departure_port || null,
            sales_person_id: currentUserId,
            status: "active",
            notes: formData.notes || null,
            agency_id: null,
            captain_info: null,
            extras: null,
            pdf_url: null,
        });

        setLoading(false);

        if (submitError) {
            setError(submitError);
        } else if (data) {
            router.push("/bookings");
        }
    };

    const selectedBoat = boats.find((b) => b.id === formData.boat_id);

    return (
        <>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tekne Seçimi */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Ship className="w-5 h-5 text-teal-600" />
                        <h2 className="text-lg font-semibold">Tekne ve Tarih</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tekne Seç *
                            </label>
                            <select
                                required
                                value={formData.boat_id}
                                onChange={(e) =>
                                    setFormData({ ...formData, boat_id: e.target.value })
                                }
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="">Tekne seçin...</option>
                                {boats.map((boat) => (
                                    <option key={boat.id} value={boat.id}>
                                        {boat.name} ({boat.specifications.capacity_max} kişi)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Kiralama Tarihi *
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.booking_date}
                                onChange={(e) =>
                                    setFormData({ ...formData, booking_date: e.target.value })
                                }
                                min={new Date().toISOString().split("T")[0]}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Başlangıç Saati
                                </label>
                                <input
                                    type="time"
                                    value={formData.check_in_time}
                                    onChange={(e) =>
                                        setFormData({ ...formData, check_in_time: e.target.value })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Bitiş Saati
                                </label>
                                <input
                                    type="time"
                                    value={formData.check_out_time}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            check_out_time: e.target.value,
                                        })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Kalkış Limanı
                            </label>
                            <select
                                value={formData.departure_port}
                                onChange={(e) =>
                                    setFormData({ ...formData, departure_port: e.target.value })
                                }
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="">Seçin...</option>
                                {DEPARTURE_PORTS.map((port) => (
                                    <option key={port} value={port}>
                                        {port}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Müşteri Bilgileri */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-teal-600" />
                        <h2 className="text-lg font-semibold">Müşteri Bilgileri</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ad Soyad *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.customer_name}
                                onChange={(e) =>
                                    setFormData({ ...formData, customer_name: e.target.value })
                                }
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                placeholder="Ahmet Yılmaz"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Telefon *
                                </label>
                                <input
                                    type="tel"
                                    required
                                    inputMode="tel"
                                    value={formData.customer_phone}
                                    onChange={(e) =>
                                        setFormData({ ...formData, customer_phone: e.target.value })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                    placeholder="+90 555 123 4567"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    E-posta
                                </label>
                                <input
                                    type="email"
                                    inputMode="email"
                                    value={formData.customer_email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, customer_email: e.target.value })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                    placeholder="ornek@email.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Misafir Sayısı *
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                max={selectedBoat?.specifications.capacity_max || 100}
                                inputMode="numeric"
                                value={formData.guests || ""}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        guests: parseInt(e.target.value) || 1,
                                    })
                                }
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                placeholder="1"
                            />
                            {selectedBoat && (
                                <p className="text-sm text-gray-500 mt-1">
                                    Maksimum kapasite: {selectedBoat.specifications.capacity_max}{" "}
                                    kişi
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Ödeme */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="w-5 h-5 text-teal-600" />
                        <h2 className="text-lg font-semibold">Ödeme Bilgileri</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Toplam Tutar *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    inputMode="decimal"
                                    value={formData.total_amount || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            total_amount: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                    placeholder="500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Kapora
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    inputMode="decimal"
                                    value={formData.paid_amount || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            paid_amount: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {formData.total_amount > 0 && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-sm text-gray-600">Rest</div>
                                <div className="text-2xl font-bold text-red-600">
                                    {(formData.total_amount - formData.paid_amount).toFixed(2)}{" "}
                                    {formData.currency}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notlar */}
                <div className="bg-white rounded-lg shadow p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notlar
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                        }
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        placeholder="Ekstra notlar..."
                    />
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {loading ? "Kaydediliyor..." : "Rezervasyonu Kaydet"}
                    </button>
                    <Link
                        href="/bookings"
                        className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                    >
                        İptal
                    </Link>
                </div>
            </form>
        </>
    );
}
