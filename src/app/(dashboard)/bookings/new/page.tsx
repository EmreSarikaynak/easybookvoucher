import { getBoats } from "@/app/actions/boat";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import BookingFormClient from "./booking-form-client";

export default async function NewBookingPage() {
    const { data: boats } = await getBoats({ status: "active" });
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return (
            <div className="p-6 max-w-2xl mx-auto">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    Lütfen giriş yapın
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-6">
                <Link
                    href="/bookings"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Geri Dön
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Yeni Kiralama</h1>
                <p className="text-gray-600 mt-1">Tekne rezervasyonu oluşturun</p>
            </div>

            <BookingFormClient boats={boats || []} currentUserId={currentUser.id} />
        </div>
    );
}
