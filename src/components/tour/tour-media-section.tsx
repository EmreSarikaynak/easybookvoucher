"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { GripVertical, Upload, Video, X, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadTourImages, uploadTourVideos } from "@/app/actions/tour";
import { isYoutubeUrl } from "@/lib/tour-i18n";
import { convertImageFileToJpeg } from "@/lib/image-client";

interface TourMediaSectionProps {
  images: string[];
  videos: string[];
  onImagesChange: (images: string[]) => void;
  onVideosChange: (videos: string[]) => void;
}

export function TourMediaSection({
  images,
  videos,
  onImagesChange,
  onVideosChange,
}: TourMediaSectionProps) {
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState("");

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      setUploadingImages(true);
      try {
        const fd = new FormData();
        for (const file of Array.from(files)) {
          fd.append("files", await convertImageFileToJpeg(file));
        }
        e.target.value = "";
        const result = await uploadTourImages(fd);
        if (result.error) {
          alert(result.error);
          return;
        }
        if (result.urls?.length) {
          onImagesChange([...images, ...result.urls]);
        }
      } catch {
        alert("Resim yüklenirken hata oluştu.");
      } finally {
        setUploadingImages(false);
      }
    },
    [images, onImagesChange]
  );

  const handleVideoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      setUploadingVideos(true);
      try {
        const fd = new FormData();
        for (const file of Array.from(files)) fd.append("files", file);
        e.target.value = "";
        const result = await uploadTourVideos(fd);
        if (result.error) {
          alert(result.error);
          return;
        }
        if (result.urls?.length) {
          onVideosChange([...videos, ...result.urls]);
        }
      } catch {
        alert("Video yüklenirken hata oluştu.");
      } finally {
        setUploadingVideos(false);
      }
    },
    [videos, onVideosChange]
  );

  const addVideoUrl = () => {
    const url = videoUrlInput.trim();
    if (!url) return;
    if (!isYoutubeUrl(url) && !url.startsWith("http")) {
      alert("Geçerli bir URL girin (YouTube veya video linki).");
      return;
    }
    onVideosChange([...videos, url]);
    setVideoUrlInput("");
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const moveImage = (fromIndex: number) => {
    const newImages = [...images];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.unshift(removed);
    onImagesChange(newImages);
  };

  const removeVideo = (index: number) => {
    onVideosChange(videos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>
          Tur Resimleri{" "}
          <span className="text-xs text-muted-foreground">(İlk resim kapak)</span>
        </Label>
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {images.map((img, index) => (
              <div
                key={`${img}-${index}`}
                className={`relative aspect-video rounded-lg overflow-hidden border-2 ${
                  index === 0 ? "border-primary" : "border-transparent"
                }`}
              >
                <Image src={img} alt={`Tur ${index + 1}`} fill className="object-cover" />
                {index === 0 && (
                  <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1 rounded">
                    Kapak
                  </div>
                )}
                <div className="absolute top-1 right-1 flex gap-1">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => moveImage(index)}
                      className="bg-white/80 hover:bg-white p-1 rounded"
                      title="Kapak yap"
                    >
                      <GripVertical className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="bg-white/80 hover:bg-white p-1 rounded"
                  >
                    <X className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <label className="cursor-pointer inline-flex">
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            disabled={uploadingImages}
          />
          <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted">
            <Upload className="h-4 w-4" />
            <span className="text-sm">{uploadingImages ? "Yükleniyor..." : "Resim Yükle"}</span>
          </div>
        </label>
      </div>

      <div className="space-y-2">
        <Label>Videolar (YouTube URL veya dosya)</Label>
        <div className="flex gap-2">
          <Input
            value={videoUrlInput}
            onChange={(e) => setVideoUrlInput(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={addVideoUrl}>
            <LinkIcon className="h-4 w-4 mr-1" />
            URL Ekle
          </Button>
        </div>
        {videos.length > 0 && (
          <ul className="space-y-2">
            {videos.map((v, index) => (
              <li
                key={`${v}-${index}`}
                className="flex items-center gap-2 text-sm border rounded-md px-3 py-2"
              >
                <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">{v}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeVideo(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <label className="cursor-pointer inline-flex">
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            multiple
            onChange={handleVideoUpload}
            className="hidden"
            disabled={uploadingVideos}
          />
          <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted">
            <Upload className="h-4 w-4" />
            <span className="text-sm">{uploadingVideos ? "Yükleniyor..." : "Video Dosyası Yükle"}</span>
          </div>
        </label>
      </div>
    </div>
  );
}
