"use client";

import { useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadLogo } from "@/app/actions/settings";
import { useRouter } from "next/navigation";

interface LogoSettingsProps {
    currentLogo: string | null;
}

export function LogoSettings({ currentLogo }: LogoSettingsProps) {
    const router = useRouter();
    const [isUploading, setIsUploading] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(currentLogo);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const objectUrl = URL.createObjectURL(file);
        setLogoPreview(objectUrl);

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await uploadLogo(formData);
            if ('error' in res) {
                alert("Logo yüklenirken hata oluştu: " + res.error);
                setLogoPreview(currentLogo); // revert
            } else {
                router.refresh(); // Update server components
            }
        } catch (err) {
            console.error(err);
            alert("Beklenmedik bir hata oluştu.");
            setLogoPreview(currentLogo);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Site Logosu</CardTitle>
                <CardDescription>
                    Login ekranı, biletler ve site genelinde kullanılacak logo.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-6">
                    {/* Preview Area */}
                    <div className="relative h-24 w-24 border rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                        {logoPreview ? (
                            <Image
                                src={logoPreview}
                                alt="Site Logo"
                                fill
                                className="object-contain p-2"
                            />
                        ) : (
                            <span className="text-gray-300 text-xs">Logo Yok</span>
                        )}
                    </div>

                    {/* Upload Button */}
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="outline"
                            disabled={isUploading}
                            className="relative"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Yükleniyor...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Yeni Logo Yükle
                                </>
                            )}
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*.png,image/*.jpg,image/*.jpeg,image/*.svg,image/*.webp"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            PNG, JPG, SVG veya WEBP (Max 2MB)
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
