import { getOccupancyMatrix } from "@/app/actions/calendar";
import { OperationsClient } from "./operations-client";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
    // Get April to October of current year
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-04-01`;
    const endDate = `${currentYear}-10-31`;

    const [{ data: occupancyData, error }, currentUser] = await Promise.all([
        getOccupancyMatrix(startDate, endDate),
        getCurrentUser(),
    ]);

    if (!currentUser) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    Kullanıcı bilgisi alınamadı. Lütfen tekrar giriş yapın.
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Operasyon Takvimi
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {currentYear} sezonu (Nisan - Ekim) doluluk durumu
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

            <OperationsClient occupancyData={occupancyData || []} currentUserId={currentUser.id} />
        </div>
    );
}
