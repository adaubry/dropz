"use client";

import NextImage, { ImageProps } from "next/image";
import { useImageLoading } from "@/lib/image-loading-context";

export function OptimizedImage(props: Omit<ImageProps, "loading" | "decoding">) {
  const { getLoadingStrategy } = useImageLoading();
  const loading = getLoadingStrategy();

  return (
    <NextImage
      {...props}
      loading={loading}
      decoding="sync"
    />
  );
}
