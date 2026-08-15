"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const storageKey = "coldpower-compare";
const maximumComparedProducts = 4;

type CompareContextValue = { selectedIds: string[]; canAdd: boolean; has: (productId: string) => boolean; toggle: (productId: string) => void; clear: () => void };
const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    window.queueMicrotask(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
        if (Array.isArray(stored)) setSelectedIds(stored.filter((value): value is string => typeof value === "string").slice(0, maximumComparedProducts));
      } catch {
        setSelectedIds([]);
      }
      setIsHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (isHydrated) window.localStorage.setItem(storageKey, JSON.stringify(selectedIds));
  }, [isHydrated, selectedIds]);

  const toggle = useCallback((productId: string) => {
    setSelectedIds((current) => {
      if (current.includes(productId)) return current.filter((id) => id !== productId);
      if (current.length >= maximumComparedProducts) return current;
      return [...current, productId];
    });
  }, []);

  const value = useMemo(() => ({ selectedIds, canAdd: selectedIds.length < maximumComparedProducts, has: (productId: string) => selectedIds.includes(productId), toggle, clear: () => setSelectedIds([]) }), [selectedIds, toggle]);
  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) throw new Error("useCompare must be used inside CompareProvider");
  return context;
}
