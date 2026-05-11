import { getBookingById } from "@/app/actions/booking";
import { getBoatById } from "@/app/actions/boat";
import { notFound } from "next/navigation";
import BookingDetailClient from "./booking-detail-client";

export default async function BookingDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const { data: booking, error: bookingError } = await getBookingById(
        params.id
    );

    if (bookingError || !booking) {
        notFound();
    }

    // Fetch boat details
    const { data: boat } = await getBoatById(booking.boat_id);

    const bookingWithBoat = {
        ...booking,
        boat: boat || undefined,
    };

    return <BookingDetailClient booking={bookingWithBoat} />;
}
