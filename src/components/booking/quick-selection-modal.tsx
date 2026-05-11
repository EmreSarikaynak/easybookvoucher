"use client";

import { Ship, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

interface QuickSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function QuickSelectionModal({
    isOpen,
    onClose,
}: QuickSelectionModalProps) {
    const router = useRouter();

    if (!isOpen) return null;

    const handleTourVoucher = () => {
        onClose();
        router.push("/vouchers/new");
    };

    const handleBoatRental = () => {
        onClose();
        router.push("/bookings/new");
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                        Bilet Türü Seçin
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tour Voucher Option */}
                        <button
                            onClick={handleTourVoucher}
                            className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg min-h-[200px] touch-manipulation"
                        >
                            <Calendar className="w-16 h-16 mb-4" />
                            <h3 className="text-xl font-bold mb-2">Günlük Tur Biletle</h3>
                            <p className="text-sm text-blue-100 text-center">
                                Grup turları için voucher oluştur
                            </p>
                        </button>

                        {/* Boat Rental Option */}
                        <button
                            onClick={handleBoatRental}
                            className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all transform hover:scale-105 shadow-lg min-h-[200px] touch-manipulation"
                        >
                            <Ship className="w-16 h-16 mb-4" />
                            <h3 className="text-xl font-bold mb-2">Özel Tekne Kiralama</h3>
                            <p className="text-sm text-teal-100 text-center">
                                Özel tekne rezervasyonu oluştur
                            </p>
                        </button>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="mt-6 w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        İptal
                    </button>
                </div>
            </div>
        </>
    );
}
