"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

const STORAGE_KEY = "coldpower-home-favorites";

export function HomeFavoriteButton({ productId, productName }: { productId: string; productName: string }) {
  const [favorite, setFavorite] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
      return Array.isArray(stored) && stored.includes(productId);
    } catch {
      return false;
    }
  });

  function toggle() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
      const current = Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string") : [];
      const next = current.includes(productId) ? current.filter((value) => value !== productId) : [...current, productId];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-40)));
      setFavorite(next.includes(productId));
    } catch {
      setFavorite((value) => !value);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="home-favorite-button"
      aria-label={favorite ? `Quitar ${productName} de favoritos` : `Agregar ${productName} a favoritos`}
      aria-pressed={favorite}
    >
      <Heart className="h-5 w-5" fill={favorite ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}
