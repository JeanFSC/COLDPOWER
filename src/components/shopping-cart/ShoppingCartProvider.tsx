"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartView } from "@/lib/shopping-cart-service";
import { unconfiguredTaxBreakdown } from "@/lib/tax";

// Purchase cart state. The server (/api/carrito, Postgres) is the only source of truth: every
// change is a request, and the UI renders the view the server returns (prices included).
type Status = "loading" | "ready" | "error";
type ShoppingCartContextValue = {
  cart: CartView;
  status: Status;
  pendingProductId: string | null;
  error: string | null;
  addItem: (productId: string, quantity?: number) => Promise<boolean>;
  setQuantity: (productId: string, quantity: number) => Promise<boolean>;
  removeItem: (productId: string) => Promise<boolean>;
  clear: () => Promise<boolean>;
  refresh: () => Promise<void>;
  dismissError: () => void;
};

const emptyCart: CartView = { cartId: null, version: 0, items: [], totalQuantity: 0, subtotal: null, currency: null, canCheckout: false, issues: [], tax: unconfiguredTaxBreakdown() };
const ShoppingCartContext = createContext<ShoppingCartContextValue | null>(null);

type CartResponse = { success: boolean; cart?: CartView; message?: string };

export function ShoppingCartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartView>(emptyCart);
  const [status, setStatus] = useState<Status>("loading");
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (input: string, init: RequestInit | undefined, productId: string | null) => {
    setPendingProductId(productId);
    setError(null);
    try {
      const response = await fetch(input, { credentials: "include", cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
      const result = (await response.json().catch(() => ({ success: false }))) as CartResponse;
      if (!response.ok || !result.success || !result.cart) {
        setError(result.message ?? "No se pudo actualizar el carrito. Inténtalo nuevamente.");
        return false;
      }
      setCart(result.cart);
      setStatus("ready");
      return true;
    } catch {
      setError("No hay conexión con el carrito. Revisa tu internet e inténtalo nuevamente.");
      return false;
    } finally {
      setPendingProductId(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const ok = await request("/api/carrito", undefined, null);
    if (!ok) setStatus("error");
  }, [request]);

  useEffect(() => {
    let cancelled = false;
    window.queueMicrotask(() => {
      if (!cancelled) void refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const addItem = useCallback((productId: string, quantity = 1) => request("/api/carrito", { method: "POST", body: JSON.stringify({ productId, quantity }) }, productId), [request]);
  const setQuantity = useCallback((productId: string, quantity: number) => request(`/api/carrito/items/${encodeURIComponent(productId)}`, { method: "PUT", body: JSON.stringify({ quantity }) }, productId), [request]);
  const removeItem = useCallback((productId: string) => request(`/api/carrito/items/${encodeURIComponent(productId)}`, { method: "DELETE" }, productId), [request]);
  const clear = useCallback(() => request("/api/carrito", { method: "DELETE" }, null), [request]);
  const dismissError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({ cart, status, pendingProductId, error, addItem, setQuantity, removeItem, clear, refresh, dismissError }),
    [addItem, cart, clear, dismissError, error, pendingProductId, refresh, removeItem, setQuantity, status],
  );
  return <ShoppingCartContext.Provider value={value}>{children}</ShoppingCartContext.Provider>;
}

export function useShoppingCart() {
  const context = useContext(ShoppingCartContext);
  if (!context) throw new Error("useShoppingCart must be used inside ShoppingCartProvider");
  return context;
}
