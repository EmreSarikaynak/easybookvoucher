"use client";

import { Boat, CurrencyType } from "@/lib/types";
import { BoatCard } from "./boat-card";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BoatCarouselProps {
    boats: Boat[];
    onBoatSelect?: (boat: Boat) => void;
    selectedCurrency?: CurrencyType;
}

export function BoatCarousel({
    boats,
    onBoatSelect,
    selectedCurrency = "EUR",
}: BoatCarouselProps) {
    const [scrollPosition, setScrollPosition] = useState(0);

    const scroll = (direction: "left" | "right") => {
        const container = document.getElementById("boat-carousel");
        if (!container) return;

        const scrollAmount = 280; // card width + gap
        const newPosition =
            direction === "left"
                ? Math.max(0, scrollPosition - scrollAmount)
                : scrollPosition + scrollAmount;

        container.scrollTo({ left: newPosition, behavior: "smooth" });
        setScrollPosition(newPosition);
    };

    const filteredBoats = boats.filter((boat) => boat.status === "active");

    if (filteredBoats.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                Henüz tekne eklenmemiş
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Left Arrow */}
            {scrollPosition > 0 && (
                <button
                    onClick={() => scroll("left")}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow"
                    aria-label="Önceki"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
            )}

            {/* Carousel Container */}
            <div
                id="boat-carousel"
                className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
                style={{
                    scrollSnapType: "x mandatory",
                    WebkitOverflowScrolling: "touch",
                }}
            >
                {filteredBoats.map((boat) => (
                    <div key={boat.id} className="snap-start">
                        <BoatCard boat={boat} onSelect={onBoatSelect} />
                    </div>
                ))}
            </div>

            {/* Right Arrow */}
            <button
                onClick={() => scroll("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow"
                aria-label="Sonraki"
            >
                <ChevronRight className="w-6 h-6" />
            </button>

            <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div>
    );
}
