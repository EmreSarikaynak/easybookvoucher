"use client";

import { useState } from "react";
import { OccupancyMatrix } from "@/components/calendar/occupancy-matrix";
import { QuickBookingModal } from "@/components/calendar/quick-booking-modal";
import type { OccupancyCalendar } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth-helpers";
import { useRouter } from "next/navigation";

interface OperationsClientProps {
    occupancyData: OccupancyCalendar[];
    currentUserId: string;
}

export function OperationsClient({ occupancyData, currentUserId }: OperationsClientProps) {
    const router = useRouter();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<{
        boatId: string;
        boatName: string;
        date: string;
    } | null>(null);

    const handleCellClick = (boatId: string, date: string) => {
        // Find the occupancy record for this cell
        const occupancy = occupancyData.find(
            (item) => item.boat_id === boatId && item.date === date
        );

        // Only allow booking on available dates
        if (occupancy?.status !== "available") {
            return;
        }

        // Get boat name
        const boatName = occupancy?.boat?.name || "Tekne";

        setSelectedBooking({
            boatId,
            boatName,
            date,
        });
        setModalOpen(true);
    };

    const handleBookingSuccess = () => {
        // Refresh the page to update the calendar
        router.refresh();
    };

    return (
        <>
            {/* Calendar Matrix */}
            {occupancyData && occupancyData.length > 0 ? (
                <OccupancyMatrix
                    occupancyData={occupancyData}
                    onCellClick={handleCellClick}
                />
            ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <p className="text-gray-500 text-lg mb-4">
                        Takvim verisi bulunamadı
                    </p>
                    <p className="text-gray-400 text-sm">
                        Lütfen önce tekneleri ekleyin, sistem otomatik olarak takvim
                        oluşturacaktır.
                    </p>
                </div>
            )}

            {/* Quick Stats */}
            {occupancyData && occupancyData.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="text-green-700 text-sm font-medium">Müsait</div>
                        <div className="text-2xl font-bold text-green-900">
                            {occupancyData.filter((d) => d.status === "available").length}
                        </div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="text-red-700 text-sm font-medium">Dolu</div>
                        <div className="text-2xl font-bold text-red-900">
                            {occupancyData.filter((d) => d.status === "booked").length}
                        </div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="text-yellow-700 text-sm font-medium">
                            Ödeme Bekliyor
                        </div>
                        <div className="text-2xl font-bold text-yellow-900">
                            {occupancyData.filter((d) => d.status === "pending").length}
                        </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="text-gray-700 text-sm font-medium">Bloke</div>
                        <div className="text-2xl font-bold text-gray-900">
                            {occupancyData.filter((d) => d.status === "blocked").length}
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Booking Modal */}
            {selectedBooking && (
                <QuickBookingModal
                    open={modalOpen}
                    onOpenChange={setModalOpen}
                    boatId={selectedBooking.boatId}
                    boatName={selectedBooking.boatName}
                    date={selectedBooking.date}
                    currentUserId={currentUserId}
                    onSuccess={handleBookingSuccess}
                />
            )}
        </>
    );
}
