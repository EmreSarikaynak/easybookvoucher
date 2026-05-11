import { Boat, BoatBooking } from "@/lib/types";

/**
 * Returns the featured image URL for a boat (first image in gallery)
 */
export function getFeaturedImage(boat: Boat): string | null {
    if (boat.gallery && boat.gallery.length > 0) {
        return boat.gallery[0];
    }
    return null;
}

/**
 * Returns a placeholder image URL when no boat image is available
 */
export function getBoatPlaceholder(): string {
    return "/placeholder-boat.jpg";
}

/**
 * Gets the display image for a boat (featured or placeholder)
 */
export function getBoatDisplayImage(boat: Boat): string {
    return getFeaturedImage(boat) || getBoatPlaceholder();
}
