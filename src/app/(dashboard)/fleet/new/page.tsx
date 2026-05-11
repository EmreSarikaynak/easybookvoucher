"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBoat } from "@/app/actions/boat";
import { uploadBoatImage, deleteBoatImage } from "@/app/actions/upload-boat-image";
import { 
    BOAT_EQUIPMENT_CATEGORIES,
    ENGINE_TYPE_OPTIONS,
    FUEL_TYPE_OPTIONS,
    HULL_MATERIAL_OPTIONS
} from "@/lib/types";
import { ArrowLeft, X, Loader2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function NewBoatPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        length_meters: "",
        capacity_max: "",
        crew_count: "",
        equipment: [] as string[],
        // Extended specs
        width_meters: "",
        draft_meters: "",
        year_built: "",
        engine_type: "",
        engine_power_hp: "",
        fuel_type: "",
        hull_material: "",
        cabin_count: "",
        bathroom_count: "",
        water_tank_liters: "",
        fuel_tank_liters: "",
        
        base_price: "",
        currency: "EUR" as const,
        status: "active" as const,
    });

    const [imageUrls, setImageUrls] = useState<string[]>([]);
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
        const reqNum = (val: string | number) => Number(val);

        const { data, error: submitError } = await createBoat({
            name: formData.name,
            specifications: {
                length_meters: reqNum(formData.length_meters),
                capacity_max: reqNum(formData.capacity_max),
                crew_count: reqNum(formData.crew_count),
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
            base_price: reqNum(formData.base_price),
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

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <Link
                    href="/fleet"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Geri Dön
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Yeni Tekne Ekle</h1>
                <p className="text-gray-600 mt-1">Filoya yeni tekne ekleyin</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Resim Galerisi */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Tekne Resimleri</h2>

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
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-blue-500 transition-colors bg-gray-50/50">
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
                                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium whitespace-nowrap transition-colors"
                                >
                                    URL Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Temel Bilgiler */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Temel Bilgiler</h2>

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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-shadow"
                                placeholder="Örn: Gökbilim Gulet"
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
                                    value={formData.length_meters}
                                    onChange={(e) =>
                                        setFormData({ ...formData, length_meters: e.target.value })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="20"
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
                                    placeholder="Opsiyonel"
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
                                    placeholder="Opsiyonel"
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
                                    placeholder="Örn: 2020"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Kapasite (kişi) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    inputMode="numeric"
                                    value={formData.capacity_max}
                                    onChange={(e) =>
                                        setFormData({ ...formData, capacity_max: e.target.value })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="12"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mürettebat Sayısı *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    inputMode="numeric"
                                    value={formData.crew_count}
                                    onChange={(e) =>
                                        setFormData({ ...formData, crew_count: e.target.value })
                                    }
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="3"
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
                                    placeholder="Opsiyonel"
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
                                    placeholder="Opsiyonel"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Teknik Detaylar */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Teknik Detaylar</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Motor Tipi
                            </label>
                            <select
                                value={formData.engine_type}
                                onChange={(e) => setFormData({ ...formData, engine_type: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
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
                                placeholder="Örn: 450"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Yakıt Tipi
                            </label>
                            <select
                                value={formData.fuel_type}
                                onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
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
                                placeholder="Örn: 1000"
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
                                placeholder="Örn: 2000"
                            />
                        </div>
                    </div>
                </div>

                {/* Ekipman */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6">Ekipman & Özellikler</h2>
                    
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
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Fiyatlandırma</h2>

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
                                value={formData.base_price}
                                onChange={(e) =>
                                    setFormData({ ...formData, base_price: e.target.value })
                                }
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Örn: 500"
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="EUR">EUR (€)</option>
                                <option value="USD">USD ($)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="TRY">TRY (₺)</option>
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
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
                        className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-colors shadow-sm"
                    >
                        {loading ? "Kaydediliyor..." : "Tekneyi Kaydet"}
                    </button>
                    <Link
                        href="/fleet"
                        className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors flex items-center justify-center"
                    >
                        İptal
                    </Link>
                </div>
            </form>
        </div>
    );
}
