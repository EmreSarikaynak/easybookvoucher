"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBoat, deleteBoat } from "@/app/actions/boat";
import { uploadBoatImage, deleteBoatImage } from "@/app/actions/upload-boat-image";
import { 
    Boat, 
    BOAT_EQUIPMENT_CATEGORIES,
    ENGINE_TYPE_OPTIONS,
    FUEL_TYPE_OPTIONS,
    HULL_MATERIAL_OPTIONS
} from "@/lib/types";
import { Trash2, Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface BoatEditFormProps {
    boat: Boat;
}

export default function BoatEditForm({ boat }: BoatEditFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [formData, setFormData] = useState({
        name: boat.name,
        length_meters: boat.specifications.length_meters,
        capacity_max: boat.specifications.capacity_max,
        crew_count: boat.specifications.crew_count,
        equipment: boat.specifications.equipment,
        // Extended specs
        width_meters: boat.specifications.width_meters || "",
        draft_meters: boat.specifications.draft_meters || "",
        year_built: boat.specifications.year_built || "",
        engine_type: boat.specifications.engine_type || "",
        engine_power_hp: boat.specifications.engine_power_hp || "",
        fuel_type: boat.specifications.fuel_type || "",
        hull_material: boat.specifications.hull_material || "",
        cabin_count: boat.specifications.cabin_count || "",
        bathroom_count: boat.specifications.bathroom_count || "",
        water_tank_liters: boat.specifications.water_tank_liters || "",
        fuel_tank_liters: boat.specifications.fuel_tank_liters || "",
        
        base_price: boat.base_price,
        currency: boat.currency,
        status: boat.status,
    });

    const [imageUrls, setImageUrls] = useState<string[]>(boat.gallery);
    const [newImageUrl, setNewImageUrl] = useState("");

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setError(null);

        const newUrls: string[] = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const uploadFormData = new FormData();
            uploadFormData.append("file", file);

            const { url, error: uploadError } = await uploadBoatImage(uploadFormData);

            if (uploadError) {
                setError(uploadError);
                break;
            }

            if (url) {
                newUrls.push(url);
            }
        }

        if (newUrls.length > 0) {
            setImageUrls((prev) => [...prev, ...newUrls]);
        }

        setUploading(false);
        // Reset file input
        if (e.target) {
            e.target.value = '';
        }
    };

    const addImageUrl = () => {
        if (newImageUrl.trim()) {
            setImageUrls([...imageUrls, newImageUrl.trim()]);
            setNewImageUrl("");
        }
    };

    const removeImage = async (index: number) => {
        const urlToRemove = imageUrls[index];
        setImageUrls(imageUrls.filter((_, i) => i !== index));

        // Optionally, delete from Supabase Storage if it's a supabase URL
        if (urlToRemove.includes('supabase.co')) {
            await deleteBoatImage(urlToRemove);
        }
    };

    const toggleEquipment = (item: string) => {
        setFormData((prev) => ({
            ...prev,
            equipment: prev.equipment.includes(item)
                ? prev.equipment.filter((e) => e !== item)
                : [...prev.equipment, item],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Helper to parse numbers safely
        const num = (val: string | number) => val === "" ? undefined : Number(val);

        const { data, error: submitError } = await updateBoat(boat.id, {
            name: formData.name,
            specifications: {
                length_meters: formData.length_meters,
                capacity_max: formData.capacity_max,
                crew_count: formData.crew_count,
                equipment: formData.equipment,
                width_meters: num(formData.width_meters),
                draft_meters: num(formData.draft_meters),
                year_built: num(formData.year_built),
                engine_type: formData.engine_type || undefined,
                engine_power_hp: num(formData.engine_power_hp),
                fuel_type: formData.fuel_type || undefined,
                hull_material: formData.hull_material || undefined,
                cabin_count: num(formData.cabin_count),
                bathroom_count: num(formData.bathroom_count),
                water_tank_liters: num(formData.water_tank_liters),
                fuel_tank_liters: num(formData.fuel_tank_liters),
            },
            base_price: formData.base_price,
            currency: formData.currency,
            gallery: imageUrls,
            status: formData.status,
        });

        setLoading(false);

        if (submitError) {
            setError(submitError);
        } else if (data) {
            router.push("/fleet");
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        const { error: deleteError } = await deleteBoat(boat.id);
        setLoading(false);

        if (deleteError) {
            setError(deleteError);
        } else {
            router.push("/fleet");
        }
    };

    return (
        <>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Resim Galerisi */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">Tekne Resimleri</h2>

                    {/* Mevcut Resimler */}
                    {imageUrls.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {imageUrls.map((url, index) => (
                                <div key={index} className="relative group aspect-video rounded-lg overflow-hidden border border-gray-200">
                                    <Image
                                        src={url}
                                        alt={`Tekne resmi ${index + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                    {index === 0 && (
                                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-md shadow">
                                            Kapak
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        title="Sil"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Dosya Yükleme */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-blue-500 transition-colors bg-gray-50">
                            <input
                                type="file"
                                id="file-upload"
                                multiple
                                accept="image/jpeg,image/png,image/webp,image/avif"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                className="hidden"
                            />
                            <label
                                htmlFor="file-upload"
                                className={`cursor-pointer flex flex-col items-center ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                {uploading ? (
                                    <Loader2 className="w-10 h-10 text-blue-500 mb-3 animate-spin" />
                                ) : (
                                    <ImageIcon className="w-10 h-10 text-gray-400 mb-3" />
                                )}
                                <span className="text-sm font-medium text-gray-900 mb-1">
                                    {uploading ? 'Yükleniyor...' : 'Görsel Yükle'}
                                </span>
                                <span className="text-xs text-gray-500">
                                    Sürükle bırak veya bilgisayarından seç
                                </span>
                                <span className="text-xs text-gray-400 mt-2">
                                    JPEG, PNG, WebP (Max 5MB)
                                </span>
                            </label>
                        </div>

                        {/* URL ile Ekleme */}
                        <div className="flex flex-col justify-center">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Veya URL ile ekle
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    value={newImageUrl}
                                    onChange={(e) => setNewImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={addImageUrl}
                                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium whitespace-nowrap"
                                >
                                    URL Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Temel Bilgiler */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">Temel Bilgiler</h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tekne Adı *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Uzunluk (m) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.1"
                                    inputMode="decimal"
                                    value={formData.length_meters || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            length_meters: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Genişlik (m)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    inputMode="decimal"
                                    value={formData.width_meters}
                                    onChange={(e) =>
                                        setFormData({ ...formData, width_meters: e.target.value })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Su Çekimi (m)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    inputMode="decimal"
                                    value={formData.draft_meters}
                                    onChange={(e) =>
                                        setFormData({ ...formData, draft_meters: e.target.value })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Yapım Yılı
                                </label>
                                <input
                                    type="number"
                                    min="1900"
                                    max={new Date().getFullYear()}
                                    value={formData.year_built}
                                    onChange={(e) =>
                                        setFormData({ ...formData, year_built: e.target.value })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Kapasite *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    inputMode="numeric"
                                    value={formData.capacity_max || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            capacity_max: parseInt(e.target.value) || 0,
                                        })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mürettebat *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    inputMode="numeric"
                                    value={formData.crew_count || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            crew_count: parseInt(e.target.value) || 0,
                                        })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Kabin Sayısı
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.cabin_count}
                                    onChange={(e) =>
                                        setFormData({ ...formData, cabin_count: e.target.value })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Banyo Sayısı
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.bathroom_count}
                                    onChange={(e) =>
                                        setFormData({ ...formData, bathroom_count: e.target.value })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Teknik Detaylar */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">Teknik Detaylar</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Motor Tipi
                            </label>
                            <select
                                value={formData.engine_type}
                                onChange={(e) => setFormData({ ...formData, engine_type: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seçiniz...</option>
                                {ENGINE_TYPE_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Motor Gücü (HP)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.engine_power_hp}
                                onChange={(e) => setFormData({ ...formData, engine_power_hp: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Yakıt Tipi
                            </label>
                            <select
                                value={formData.fuel_type}
                                onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seçiniz...</option>
                                {FUEL_TYPE_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Gövde Malzemesi
                            </label>
                            <select
                                value={formData.hull_material}
                                onChange={(e) => setFormData({ ...formData, hull_material: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seçiniz...</option>
                                {HULL_MATERIAL_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Su Tankı (Litre)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.water_tank_liters}
                                onChange={(e) => setFormData({ ...formData, water_tank_liters: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Yakıt Tankı (Litre)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.fuel_tank_liters}
                                onChange={(e) => setFormData({ ...formData, fuel_tank_liters: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Ekipman */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-6">Ekipman & Özellikler</h2>
                    
                    <div className="space-y-8">
                        {Object.entries(BOAT_EQUIPMENT_CATEGORIES).map(([category, items]) => (
                            <div key={category}>
                                <h3 className="text-md font-medium text-gray-800 mb-3 border-b pb-2">{category}</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {items.map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => toggleEquipment(item)}
                                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left flex items-center justify-between ${
                                                formData.equipment.includes(item)
                                                    ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                                                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                                            }`}
                                        >
                                            <span className="truncate">{item}</span>
                                            {formData.equipment.includes(item) && (
                                                <div className="w-2 h-2 rounded-full bg-blue-500 ml-2 flex-shrink-0"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Fiyat ve Durum */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">Fiyat ve Durum</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Günlük Fiyat *
                            </label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                value={formData.base_price || ""}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        base_price: parseFloat(e.target.value) || 0,
                                    })
                                }
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Para Birimi *
                            </label>
                            <select
                                value={formData.currency}
                                onChange={(e) =>
                                    setFormData({ ...formData, currency: e.target.value as any })
                                }
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="EUR">EUR</option>
                                <option value="USD">USD</option>
                                <option value="GBP">GBP</option>
                                <option value="TRY">TRY</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Durum *
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) =>
                                    setFormData({ ...formData, status: e.target.value as any })
                                }
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="active">Aktif</option>
                                <option value="maintenance">Bakımda</option>
                                <option value="inactive">Pasif</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                    <button
                        type="submit"
                        disabled={loading || uploading}
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                        {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                    </button>
                    <Link
                        href="/fleet"
                        className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center"
                    >
                        İptal
                    </Link>
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </form>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Tekneyi Sil</h3>
                        <p className="text-gray-600 mb-6">
                            <span className="font-semibold">{boat.name}</span> isimli tekneyi silmek istediğinize emin misiniz? Bu
                            işlem geri alınamaz.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                            >
                                {loading ? "Siliniyor..." : "Evet, Sil"}
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={loading}
                                className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                İptal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
