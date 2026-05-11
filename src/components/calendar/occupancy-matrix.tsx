"use client";

import { OccupancyCalendar, OCCUPANCY_COLORS, OCCUPANCY_STATUS_LABELS } from "@/lib/types";
import { useEffect, useState } from "react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface OccupancyMatrixProps {
    occupancyData: OccupancyCalendar[];
    onCellClick?: (boatId: string, date: string) => void;
}

export function OccupancyMatrix({ occupancyData, onCellClick }: OccupancyMatrixProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3)); // April 2026
    const [boats, setBoats] = useState<Map<string, any>>(new Map());

    useEffect(() => {
        // Group data by boat
        const boatMap = new Map();
        occupancyData.forEach((item) => {
            if (item.boat && !boatMap.has(item.boat.id)) {
                boatMap.set(item.boat.id, item.boat);
            }
        });
        setBoats(boatMap);
    }, [occupancyData]);

    // Generate days for current month
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const getStatusForCell = (boatId: string, date: Date): string => {
        const dateStr = format(date, "yyyy-MM-dd");
        const item = occupancyData.find(
            (d) => d.boat_id === boatId && d.date === dateStr
        );
        return item?.status || "available";
    };

    if (boats.size === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                Takvim verisi yükleniyor...
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Month Navigation */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                <button
                    onClick={prevMonth}
                    disabled={currentMonth.getMonth() < 4}
                    className="p-2 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold">
                    {format(currentMonth, "MMMM yyyy", { locale: tr })}
                </h2>
                <button
                    onClick={nextMonth}
                    disabled={currentMonth.getMonth() > 9}
                    className="p-2 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Legend */}
            <div className="flex gap-4 px-4 py-2 bg-gray-50 border-b text-xs">
                {Object.entries(OCCUPANCY_STATUS_LABELS).map(([status, label]) => (
                    <div key={status} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${OCCUPANCY_COLORS[status as keyof typeof OCCUPANCY_COLORS]}`} />
                        <span>{label}</span>
                    </div>
                ))}
            </div>

            {/* Calendar Matrix */}
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="sticky left-0 bg-gray-100 px-4 py-2 text-left text-sm font-semibold text-gray-700 border-r">
                                Tekne
                            </th>
                            {days.map((day) => (
                                <th
                                    key={day.toISOString()}
                                    className="px-2 py-2 text-center text-xs font-medium text-gray-600 min-w-[40px]"
                                >
                                    {format(day, "d")}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from(boats.entries()).map(([boatId, boat]) => (
                            <tr key={boatId} className="border-b hover:bg-gray-50">
                                <td className="sticky left-0 bg-white px-4 py-3 text-sm font-medium text-gray-900 border-r">
                                    {boat.name}
                                </td>
                                {days.map((day) => {
                                    const status = getStatusForCell(boatId, day);
                                    const colorClass = OCCUPANCY_COLORS[status as keyof typeof OCCUPANCY_COLORS];
                                    const isAvailable = status === "available";

                                    return (
                                        <td
                                            key={day.toISOString()}
                                            className="px-1 py-1"
                                            onClick={() =>
                                                onCellClick?.(boatId, format(day, "yyyy-MM-dd"))
                                            }
                                        >
                                            <div
                                                className={`h-8 rounded transition-opacity ${colorClass} ${isAvailable
                                                        ? "cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-teal-500"
                                                        : "cursor-not-allowed opacity-75"
                                                    }`}
                                                title={`${boat.name} - ${format(day, "d MMMM", { locale: tr })} - ${OCCUPANCY_STATUS_LABELS[status as keyof typeof OCCUPANCY_STATUS_LABELS]}`}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
