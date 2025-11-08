"use client";

import { createContext, useContext, useRef } from "react";

type ImageLoadingContextType = {
  getLoadingStrategy: () => "eager" | "lazy";
  reset: () => void;
};

const ImageLoadingContext = createContext<ImageLoadingContextType | null>(null);

export function ImageLoadingProvider({ children }: { children: React.ReactNode }) {
  const countRef = useRef(0);

  const getLoadingStrategy = (): "eager" | "lazy" => {
    const current = countRef.current++;
    return current < 15 ? "eager" : "lazy";
  };

  const reset = () => {
    countRef.current = 0;
  };

  return (
    <ImageLoadingContext.Provider value={{ getLoadingStrategy, reset }}>
      {children}
    </ImageLoadingContext.Provider>
  );
}

export function useImageLoading() {
  const context = useContext(ImageLoadingContext);
  if (!context) {
    throw new Error("useImageLoading must be used within ImageLoadingProvider");
  }
  return context;
}
