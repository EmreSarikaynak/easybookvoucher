"use client";

import { Boat, CURRENCY_SYMBOLS } from "@/lib/types";
import Image from "next/image";
import { Users, Anchor } from "lucide-react";

interface BoatCardProps {
    boat: Boat;
    onSelect?: (boat: Boat) => void;
    showPrice?: boolean;
}

export function BoatCard({ boat, onSelect, showPrice = true }: BoatCardProps) {
    const mainImage = boat.gallery[0] || "/placeholder-boat.jpg";

    return (
        <div
            className="flex-shrink-0 w-64 bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onSelect?.(boat)}
        >
            <div className="relative h-40">
                <Image
                    src={mainImage}
                    alt={boat.name}
                    fill
                    className="object-cover"
                    sizes="256px"
                />
                {boat.status === "active" && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                        Müsait
                    </div>
                )}
            </div>

            <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Anchor className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{boat.name}</h3>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{boat.specifications.capacity_max} kişi</span>
                    </div>
                    <div>
                        <span>{boat.specifications.length_meters}m</span>
                    </div>
                </div>

                {showPrice && (
                    <div className="text-lg font-bold text-blue-600">
                        {CURRENCY_SYMBOLS[boat.currency]}
                        {boat.base_price.toLocaleString("tr-TR")}
                        <span className="text-sm text-gray-500 font-normal">/gün</span>
                    </div>
                )}

                {boat.specifications.equipment.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                        {boat.specifications.equipment.slice(0, 2).join(", ")}
                        {boat.specifications.equipment.length > 2 && "..."}
                    </div>
                )}
            </div>
        </div>
    );
}
