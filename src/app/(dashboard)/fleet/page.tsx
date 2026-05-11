import { getBoats } from "@/app/actions/boat";
import { BoatCard } from "@/components/boat/boat-card";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FleetPage() {
    const { data: boats, error } = await getBoats({ status: "active" });

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Filo Yönetimi</h1>
                    <p className="text-gray-600 mt-1">Tekne filosunu yönetin</p>
                </div>

                <Link
                    href="/fleet/new"
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Tekne Ekle
                </Link>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tekne ara..."
                        className="flex-1 outline-none"
                    />
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Boats Grid */}
            {boats && boats.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {boats.map((boat) => (
                        <Link key={boat.id} href={`/fleet/${boat.id}`}>
                            <BoatCard boat={boat} />
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <p className="text-gray-500 text-lg mb-4">Henüz tekne eklenmemiş</p>
                    <Link
                        href="/fleet/new"
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        İlk Tekneyi Ekle
                    </Link>
                </div>
            )}

            {/* Stats */}
            {boats && boats.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-gray-600 text-sm">Toplam Tekne</div>
                        <div className="text-2xl font-bold text-gray-900">
                            {boats.length}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-gray-600 text-sm">Aktif Tekneler</div>
                        <div className="text-2xl font-bold text-green-600">
                            {boats.filter((b) => b.status === "active").length}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-gray-600 text-sm">Toplam Kapasite</div>
                        <div className="text-2xl font-bold text-blue-600">
                            {boats.reduce(
                                (sum, b) => sum + b.specifications.capacity_max,
                                0
                            )}{" "}
                            kişi
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
