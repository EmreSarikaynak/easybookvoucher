import { BoatBooking, Boat } from "@/lib/types";
import { getBoatDisplayImage } from "@/lib/boat-helpers";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Image from "next/image";
import { Ship, Calendar, Users, Clock, MapPin, CreditCard } from "lucide-react";

interface BoatTicketProps {
    booking: BoatBooking & { boat?: Boat };
    containerRef?: React.RefObject<HTMLDivElement>;
}

export function BoatTicket({ booking, containerRef }: BoatTicketProps) {
    const boat = booking.boat;
    const featuredImage = boat ? getBoatDisplayImage(boat) : null;
    const customerInfo = booking.customer_info as any;
    const paymentDetails = booking.payment_details as any;

    return (
        <div
            ref={containerRef}
            id="boat-ticket-container"
            className="w-[850px] h-[300px] bg-white relative overflow-hidden"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
        >
            {/* Featured Image Background */}
            {featuredImage && (
                <div className="absolute inset-0 opacity-10">
                    <Image
                        src={featuredImage}
                        alt={boat?.name || "Tekne"}
                        fill
                        className="object-cover"
                    />
                </div>
            )}

            <div className="relative z-10 flex h-full">
                {/* Left Side - Image */}
                <div className="w-[250px] flex-shrink-0 relative">
                    {featuredImage ? (
                        <Image
                            src={featuredImage}
                            alt={boat?.name || "Tekne"}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center">
                            <Ship className="w-24 h-24 text-white opacity-50" />
                        </div>
                    )}
                </div>

                {/* Right Side - Details */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                    {/* Header */}
                    <div>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {boat?.name || "Tekne Kiralama"}
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Özel Tekne Turu Rezervasyonu
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-500">Rezervasyon No</div>
                                <div className="text-lg font-mono font-semibold">
                                    {booking.id.slice(0, 8).toUpperCase()}
                                </div>
                            </div>
                        </div>

                        {/* Boat Specs */}
                        {boat && (
                            <div className="flex gap-4 text-xs text-gray-600 mb-4">
                                <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {boat.specifications.capacity_max} kişi
                                </div>
                                <div className="flex items-center gap-1">
                                    <Ship className="w-3 h-3" />
                                    {boat.specifications.length_meters}m
                                </div>
                            </div>
                        )}

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-start gap-2">
                                <Calendar className="w-4 h-4 text-teal-600 mt-0.5" />
                                <div>
                                    <div className="text-xs text-gray-500">Tarih</div>
                                    <div className="font-medium">
                                        {format(new Date(booking.booking_date), "d MMMM yyyy", {
                                            locale: tr,
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-2">
                                <Clock className="w-4 h-4 text-teal-600 mt-0.5" />
                                <div>
                                    <div className="text-xs text-gray-500">Saat</div>
                                    <div className="font-medium">
                                        {booking.check_in_time || "10:00"} -{" "}
                                        {booking.check_out_time || "18:00"}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-2">
                                <Users className="w-4 h-4 text-teal-600 mt-0.5" />
                                <div>
                                    <div className="text-xs text-gray-500">Müşteri</div>
                                    <div className="font-medium">{customerInfo.name}</div>
                                    <div className="text-xs text-gray-500">{customerInfo.phone}</div>
                                </div>
                            </div>

                            {booking.departure_port && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-teal-600 mt-0.5" />
                                    <div>
                                        <div className="text-xs text-gray-500">Kalkış</div>
                                        <div className="font-medium text-xs">{booking.departure_port}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer - Payment */}
                    <div className="flex items-end justify-between border-t pt-3">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <div className="text-xs">
                                <span className="text-gray-500">Toplam: </span>
                                <span className="font-semibold">
                                    {paymentDetails.total} {paymentDetails.currency}
                                </span>
                                {paymentDetails.paid > 0 && (
                                    <>
                                        {" • "}
                                        <span className="text-green-600">
                                            Kapora: {paymentDetails.paid}
                                        </span>
                                    </>
                                )}
                                {paymentDetails.remaining > 0 && (
                                    <>
                                        {" • "}
                                        <span className="text-red-600">
                                            Rest: {paymentDetails.remaining}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="text-xs text-gray-400">
                            {format(new Date(booking.created_at), "dd.MM.yyyy HH:mm")}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
