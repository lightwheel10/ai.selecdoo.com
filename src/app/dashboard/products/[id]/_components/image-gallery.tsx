"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import type { ProductMedia } from "@/types";

interface ImageGalleryProps {
  medias: ProductMedia[];
  mainImage: string | null;
  title: string;
}

export function ImageGallery({ medias, mainImage, title }: ImageGalleryProps) {
  const allImages =
    medias.length > 0
      ? medias.sort((a, b) => a.position - b.position)
      : mainImage
        ? [{ src: mainImage, alt: title, width: null, height: null, position: 0 }]
        : [];

  const [selected, setSelected] = useState(0);
  const current = allImages[selected];

  if (allImages.length === 0) {
    return (
      <div
        className="aspect-square w-full flex items-center justify-center"
        style={{ backgroundColor: "var(--input)" }}
      >
        <Package
          className="w-16 h-16"
          style={{ color: "var(--muted-foreground)", opacity: 0.2 }}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Main image */}
      <div
        className="relative w-full aspect-square mb-2 overflow-hidden"
        style={{ backgroundColor: "var(--input)" }}
      >
        <Image
          src={current.src}
          alt={current.alt || title}
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className="relative w-14 h-14 flex-shrink-0 overflow-hidden transition-all duration-150"
              style={{
                border: i === selected
                  ? "2px solid var(--primary-text)"
                  : "2px solid var(--border)",
                opacity: i === selected ? 1 : 0.6,
              }}
            >
              <Image
                src={img.src}
                alt={img.alt || `${title} ${i + 1}`}
                fill
                className="object-cover"
                sizes="56px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
