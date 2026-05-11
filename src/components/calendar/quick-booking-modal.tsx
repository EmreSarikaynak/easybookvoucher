"use client";

import { useState } from "react";
import { createBooking } from "@/app/actions/booking";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ship, User, DollarSign, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface QuickBookingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    boatId: string;
    boatName: string;
    date: string;
    currentUserId: string;
    onSuccess: () => void;
}

export function QuickBookingModal({
    open,
    onOpenChange,
    boatId,
    boatName,
    date,
    currentUserId,
    onSuccess,
}: QuickBookingModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        guests: 1,
        total_amount: 0,
        paid_amount: 0,
        check_in_time: "10:00",
        check_out_time: "18:00",
        notes: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error: submitError } = await createBooking({
            boat_id: boatId,
            booking_date: date,
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
                currency: "EUR",
            },
            check_in_time: formData.check_in_time,
            check_out_time: formData.check_out_time,
            departure_port: null,
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
            // Reset form
            setFormData({
                customer_name: "",
                customer_phone: "",
                customer_email: "",
                guests: 1,
                total_amount: 0,
                paid_amount: 0,
                check_in_time: "10:00",
                check_out_time: "18:00",
                notes: "",
            });
            onSuccess();
            onOpenChange(false);
        }
    };

    const formattedDate = format(new Date(date), "d MMMM yyyy, EEEE", {
        locale: tr,
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">Hızlı Rezervasyon</DialogTitle>
                </DialogHeader>

                {/* Boat and Date Info Banner */}
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-teal-900">
                        <Ship className="w-5 h-5" />
                        <span className="font-semibold">{boatName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-teal-700">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{formattedDate}</span>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Customer Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-700">
                            <User className="w-4 h-4" />
                            <h3 className="font-semibold">Müşteri Bilgileri</h3>
                        </div>

                        <div className="grid gap-4">
                            <div>
                                <Label htmlFor="customer_name">Ad Soyad *</Label>
                                <Input
                                    id="customer_name"
                                    required
                                    value={formData.customer_name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, customer_name: e.target.value })
                                    }
                                    placeholder="Ahmet Yılmaz"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="customer_phone">Telefon *</Label>
                                    <Input
                                        id="customer_phone"
                                        type="tel"
                                        required
                                        value={formData.customer_phone}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                customer_phone: e.target.value,
                                            })
                                        }
                                        placeholder="+90 555 123 4567"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="customer_email">E-posta</Label>
                                    <Input
                                        id="customer_email"
                                        type="email"
                                        value={formData.customer_email}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                customer_email: e.target.value,
                                            })
                                        }
                                        placeholder="ornek@email.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="guests">Misafir Sayısı *</Label>
                                <Input
                                    id="guests"
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.guests}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            guests: parseInt(e.target.value) || 1,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Time */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-700">
                            <Clock className="w-4 h-4" />
                            <h3 className="font-semibold">Saat Bilgileri</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="check_in_time">Başlangıç</Label>
                                <Input
                                    id="check_in_time"
                                    type="time"
                                    value={formData.check_in_time}
                                    onChange={(e) =>
                                        setFormData({ ...formData, check_in_time: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor="check_out_time">Bitiş</Label>
                                <Input
                                    id="check_out_time"
                                    type="time"
                                    value={formData.check_out_time}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            check_out_time: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Payment */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-700">
                            <DollarSign className="w-4 h-4" />
                            <h3 className="font-semibold">Ödeme Bilgileri</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="total_amount">Toplam Tutar (EUR) *</Label>
                                <Input
                                    id="total_amount"
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.total_amount || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            total_amount: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    placeholder="500"
                                />
                            </div>
                            <div>
                                <Label htmlFor="paid_amount">Kapora (EUR)</Label>
                                <Input
                                    id="paid_amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.paid_amount || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            paid_amount: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {formData.total_amount > 0 && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm text-gray-600">Rest</div>
                                <div className="text-xl font-bold text-red-600">
                                    {(formData.total_amount - formData.paid_amount).toFixed(2)} EUR
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <Label htmlFor="notes">Notlar</Label>
                        <textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData({ ...formData, notes: e.target.value })
                            }
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Ekstra notlar..."
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            İptal
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Kaydediliyor..." : "Rezervasyonu Oluştur"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
