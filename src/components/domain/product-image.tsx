"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

interface ProductImageProps {
  src: string | null;
  alt: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  priority?: boolean;
  iconSize?: string;
}

export function ProductImage({
  src,
  alt,
  fill = true,
  sizes,
  className = "object-cover",
  priority = false,
  iconSize = "w-8 h-8",
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <Package
          className={iconSize}
          style={{ color: "var(--muted-foreground)", opacity: 0.3 }}
        />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      priority={priority}
      onError={() => setHasError(true)}
    />
  );
}
